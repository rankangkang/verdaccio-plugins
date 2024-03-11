import { Logger, Package } from '@verdaccio/types'
import commonApi from '@verdaccio/commons-api'
import _ from 'lodash'
import fetch, { RequestInit } from 'node-fetch'

import { API_ERROR, HEADERS, HEADER_TYPE, HTTP_STATUS } from './constants'
import {
  getMetadataLocal,
  mkdirp,
  retry,
  RetryFunction,
  streamWriteFile,
  stringifyJson,
  updateMetadata,
} from './util'
import path from 'path'
import fs from 'fs'
import { META_FILE_NAME } from './config'
import Stream from 'stream'
import createDebug from 'debug'

const debug = createDebug('sync:sync')

const jsonContentType = HEADERS.JSON
const contentTypeAccept = `${jsonContentType};`

const encode = function (thing): string {
  return encodeURIComponent(thing).replace(/^%40/, '@')
}

interface UplinkSyncConfig {
  uplink: string
  name: string
  version: string[] | 'all'
  /** 本地存储目录 */
  storePath: string
}

export default class UplinkSync {
  private readonly uplink: string
  private readonly name: string
  private readonly version: string[] | 'all'
  private readonly storePath: string
  private readonly logger: Logger

  private readonly userAgent = 'hidden'

  private readonly retry: RetryFunction

  constructor(config: UplinkSyncConfig, logger: Logger) {
    this.uplink = config.uplink
    this.name = config.name
    this.version = config.version
    this.storePath = config.storePath
    this.logger = logger
    this.retry = retry({ log: (msg) => logger.debug({}, `[sync] ${msg}`) })
    this._init()
  }

  private _init() {
    // 初始化文件目录
    const pkgDir = this.getStorage()
    mkdirp(pkgDir)
  }

  private _setAuth(headers: any): Headers {
    return headers
  }

  private _setHeaders(options: any) {
    const headers = options.headers || {}
    const accept = HEADERS.ACCEPT
    const acceptEncoding = HEADERS.ACCEPT_ENCODING
    const userAgent = HEADERS.USER_AGENT

    headers[accept] = headers[accept] || contentTypeAccept
    headers[acceptEncoding] = headers[acceptEncoding] || 'gzip'
    // registry.npmjs.org will only return search result if user-agent include string 'npm'
    headers[userAgent] = this.userAgent
      ? `npm (${this.userAgent})`
      : options.req?.get('user-agent')

    return this._setAuth(headers)
  }

  /**
   * 获取当前包存储目录
   * @param names
   * @returns
   */
  private getStorage(...names: string[]) {
    return path.join(this.storePath, this.name, ...names)
  }

  /**
   * 请求，失败重试
   * 获取 assets
   */
  private async fetch(uri: string, options?: RequestInit) {
    const headers = this._setHeaders(options || {})
    const fn = async () => {
      const resp = await fetch(uri, {
        headers: headers as any,
      })
      return resp
    }
    return this.retry(fn)
  }

  /**
   * 获取 uplink meta，返回 json 对象
   * @param name
   */
  private async getMetadata() {
    const url = path.join(this.uplink, encode(this.name))
    debug('fetch metadata: %s', url)
    const resp = await this.fetch(url)
    const json = await resp.json()
    return json
  }

  /**
   * 拉取 tgz 文件，返回文件流
   * @param url
   */
  private async fetchTarball(url: string) {
    debug('fetch tgz: %s', url)
    const resp = await this.fetch(url, {
      headers: {
        Accept: contentTypeAccept,
      },
    })

    const respStream = resp.body
    let currentLength = 0,
      expectedLength = 0

    respStream.on('error', (err) => {
      // 抛出错误，需重试
      throw commonApi.getInternalError(API_ERROR.CONTENT_MISMATCH)
    })

    respStream.on('data', (data) => {
      currentLength += data.length
    })

    respStream.on('end', (data) => {
      if (data) {
        currentLength += data.length
      }
      if (expectedLength && currentLength != expectedLength) {
        throw commonApi.getInternalError(API_ERROR.CONTENT_MISMATCH)
      }
    })

    respStream.on('open', () => {})

    if (resp.status === HTTP_STATUS.NOT_FOUND) {
      // 未找到资源
      throw commonApi.getNotFound(API_ERROR.NOT_FILE_UPLINK)
    }
    if (
      !(
        resp.status >= HTTP_STATUS.OK &&
        resp.status < HTTP_STATUS.MULTIPLE_CHOICES
      )
    ) {
      throw commonApi.getInternalError(`bad uplink status code: ${resp.status}`)
    }

    if (resp.headers[HEADER_TYPE.CONTENT_LENGTH]) {
      expectedLength = resp.headers[HEADER_TYPE.CONTENT_LENGTH]
    }

    return respStream
  }

  /**
   * 同步 元数据
   */
  async syncMetadata() {
    const metaPath = this.getStorage(META_FILE_NAME)
    const remoteMeta = await this.getMetadata()
    const localMeta = getMetadataLocal(this.name, metaPath)
    // 从远程 meta 摘取 version到 localMeta
    const mergedMeta = updateMetadata(this.version, localMeta, remoteMeta)
    const mergedMetaJson = stringifyJson(mergedMeta)
    await streamWriteFile(metaPath, Stream.Readable.from(mergedMetaJson))
    return mergedMeta
  }

  /**
   * 同步一个版本的 tarball
   */
  async syncTarball(fileName: string, url: string, version?: string) {
    const rt = await this.fetchTarball(url)
    const tgzFilePath = this.getStorage(fileName)
    await streamWriteFile(tgzFilePath, rt)
  }

  async batchSyncTarball(meta: Package) {
    const versions2Sync = Object.keys(meta.versions).filter((v) => {
      return this.version === 'all' || this.version.includes(v)
    })
    debug('versions to sync: %o', versions2Sync)

    const syncPromises = versions2Sync.map((v) => {
      const fileName = `${this.name}-${v}.tgz`
      const url = meta._distfiles[fileName].url
      return this.syncTarball(fileName, url)
    })

    return await Promise.allSettled(syncPromises)
  }
}
