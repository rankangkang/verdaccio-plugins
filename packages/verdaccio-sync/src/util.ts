import { Package, Version } from '@verdaccio/types'
import _ from 'lodash'
import { DIST_TAGS, USERS } from './constants'
import fs from 'fs'
import createDebug from 'debug'
import Stream from 'stream'

const debug = createDebug('sync:util')

export type RetryFunction = <T>(f: () => Promise<T>) => Promise<T>

/**
 * Interface for configuring the retry wrapper
 */
export interface RetryConfig {
  delay: number // In milliseconds
  retries: number
  log: (msg: string) => void
}

/**
 * Default configuration for the retry wrapper
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  delay: 100,
  retries: 10,
  log: () => undefined,
}

/**
 * Check if the given parameter represent an infinite value
 *
 * @param num
 */
const isInfinite = (num: number): boolean => num === Infinity || num < 0

/**
 * Helper function to wait for the given amount of time
 *
 * @param ms
 */
export async function wait(ms: number): Promise<void> {
  if (ms === 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve): number => setTimeout(resolve, ms))
}

/**
 * Implement a retry mechanism around a promised function. The function is executed the given amount of time
 * with delay between each execution. Once the promise succeed the retry function stop, returning the result
 * of the promise. This implementation does not use timeout or curving delay, for the sake of simplicity.
 *
 * @param f
 * @param cfg
 */
export const retry = (cfg?: Partial<RetryConfig>): RetryFunction => {
  const config = Object.assign({}, DEFAULT_RETRY_CONFIG, cfg)
  const retries = isInfinite(config.retries)
    ? Number.MAX_SAFE_INTEGER
    : config.retries

  return async <T>(f: () => Promise<T>): Promise<T> => {
    if (retries === 0) {
      return f()
    }

    let error: Error | null = null
    for (let i = 0; i <= retries; i++) {
      try {
        return await f()
      } catch (err) {
        config.log(`Retry ${i} failed: ${(err as Error).message}`)
        error = err as Error
      }

      // don't wait for last execution
      if (i < retries) {
        await wait(config.delay)
      }
    }

    throw error
  }
}

function getLatestReadme(pkg: Package): string {
  const versions = pkg['versions'] || {}
  const distTags = pkg[DIST_TAGS] || {}

  const latestVersion: Version | any = distTags['latest']
    ? versions[distTags['latest']] || {}
    : {}
  let readme = _.trim(pkg.readme || latestVersion.readme || '')
  if (readme) {
    return readme
  }

  const readmeDistTagsPriority = [
    'next',
    'beta',
    'alpha',
    'test',
    'dev',
    'canary',
  ]
  readmeDistTagsPriority.map(function (tag): string | void {
    if (readme) {
      return readme
    }
    const version: Version | any = distTags[tag]
      ? versions[distTags[tag]] || {}
      : {}
    readme = _.trim(version.readme || readme)
  })
  return readme
}

/**
 * 生成 package metadata 默认模板
 * @param name
 * @returns
 */
export function genPackageTemplate(name: string): Package {
  return {
    // standard things
    name,
    versions: {},
    time: {},
    [USERS]: {},
    [DIST_TAGS]: {},
    _uplinks: {},
    _distfiles: {},
    _attachments: {},
    _rev: '',
  }
}

/**
 * 生成文件名
 * @param name
 * @param version
 * @returns
 */
export function genDistFileName(name: string, version: string) {
  return `${name}-${version}.tgz`
}

/**
 * 生成临时文件名
 * @param fileName
 * @returns
 */
export function genTempFileName(fileName: string) {
  return `${fileName}.tmp-${String(Math.random()).replace(/^0\./, '')}`
}

export function stringifyJson(data: any) {
  return JSON.stringify(data, null, '  ')
}

/**
 * 转换metaData
 * @param metaData
 * @returns
 */
export function normalizePackageMetaData(
  metaData: Package,
  tMetaData: Package
) {
  // 转换 readme
  tMetaData.readme = getLatestReadme(metaData)

  // 序列化 _distfiles 属性
  if (!tMetaData._distfiles) {
    tMetaData._distfiles = {}
  }
  for (const versionId in metaData.versions) {
    let version = metaData.versions[versionId]
    // 同步 version 信息
    tMetaData.versions[versionId] = version

    if (version.dist && version.dist.tarball) {
      const url = new URL(version.dist.tarball)
      const filename = url.pathname.replace(/^.*\//, '')
      tMetaData._distfiles[filename] = {
        url: version.dist.tarball,
        sha: version.dist.shasum,
      }
    }
  }

  // 序列化 dist-tags
  for (const tag in metaData[DIST_TAGS]) {
    if (
      !tMetaData[DIST_TAGS][tag] ||
      tMetaData[DIST_TAGS][tag] !== metaData[DIST_TAGS][tag]
    ) {
      tMetaData[DIST_TAGS][tag] = metaData[DIST_TAGS][tag]
    }
  }

  // 同步 _rev
  metaData._rev && (tMetaData._rev = metaData._rev)
  metaData._id && (tMetaData._id = metaData._id)
  metaData.time && (tMetaData.time = metaData.time)

  return tMetaData
}

export function updateMetadata(
  versions: string[] | 'all',
  localMeta: Package,
  remoteMeta: Package
) {
  if (versions !== 'all') {
    Object.keys(remoteMeta.versions).forEach((v) => {
      if (!versions.includes(v)) {
        delete remoteMeta.versions[v]
      }
    })
  }

  const mergedMeta = normalizePackageMetaData(remoteMeta, localMeta)

  return mergedMeta
}

export function exists(p: string) {
  try {
    fs.accessSync(p)
    return true
  } catch (error) {
    return false
  }
}

/**
 * 创建目录，存在直接返回，不存在则创建
 * @param dir
 */
export function mkdirp(dir: string) {
  if (exists(dir)) {
    return
  }
  fs.mkdirSync(dir, {
    recursive: true,
  })
}

/**
 * 重命名文件
 * @param src
 * @param dst
 * @returns
 */
export function renameFile(src: string, dst: string) {
  return new Promise((resolve, reject) => {
    fs.rename(src, dst, (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(undefined)
    })
  })
}

export function removeFile(src: string) {
  return new Promise((resolve, reject) => {
    fs.unlink(src, (err) => {
      if (err) {
        debug('unlink error: %o', err)
        if (err.code === 'ENOENT') {
          return resolve(undefined)
        }
        return reject()
      }
      return resolve(undefined)
    })
  })
}

export function removeDir(dir: string) {
  return new Promise((resolve, reject) => {
    fs.rmdir(dir, { recursive: true }, (err) => {
      if (err) {
        debug('rmdir error: %o', err)
        if (err.code === 'ENOENT') {
          return resolve(undefined)
        }
        return reject()
      }
      return resolve(undefined)
    })
  })
}

export async function streamWriteFile(
  filePath: string,
  rs: Stream.Readable | NodeJS.ReadableStream
) {
  const tempFilePath = genTempFileName(filePath)
  try {
    await new Promise((resolve, reject) => {
      const ws = fs.createWriteStream(tempFilePath, { flags: 'w' })
      rs.pipe(ws)

      rs.on('end', () => {
        // 文件读取写入完毕
        resolve(undefined)
      })

      rs.on('error', (err) => {
        debug('readable stream error %o', err)
        reject(err)
      })

      ws.on('error', (err) => {
        debug('writable stream error %o', err)
        reject(err)
      })
    })
    debug('tmp file write done: %s', tempFilePath)

    // 删除原文件
    if (exists(filePath)) {
      await removeFile(filePath)
      debug('remove file %s, cause it already exist', filePath)
    }
    await renameFile(tempFilePath, filePath)
    debug('rename tmp file: %s -> %s', tempFilePath, filePath)
  } catch (error) {
    await removeFile(tempFilePath)
    debug('remove tmp file: %s', tempFilePath)
  }
}

/**
 * 读取本地的 metadata
 * @param pkgName
 * @param metaPath
 * @returns
 */
export function getMetadataLocal(pkgName: string, metaPath: string) {
  if (exists(metaPath)) {
    const metaBuf = fs.readFileSync(metaPath, { encoding: 'utf-8' }).toString()
    return JSON.parse(metaBuf) as Package
  }
  return genPackageTemplate(pkgName)
}
