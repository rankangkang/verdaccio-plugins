import { Logger } from '@verdaccio/types'
import path from 'path'
import {
  exists,
  removeFile,
  removeDir,
  streamWriteFile,
  getMetadataLocal,
  genDistFileName,
  stringifyJson,
} from './util'
import { META_FILE_NAME } from './config'
import _ from 'lodash'
import Stream from 'stream'
import createDebug from 'debug'

const debug = createDebug('sync:clean')

interface LocalCleanConfig {
  name: string
  version: string[] | 'all'
  storePath: string
}

export class LocalClean {
  private readonly name: string
  private readonly version: string[] | 'all'
  private readonly storePath: string
  private readonly logger: Logger

  constructor(config: LocalCleanConfig, logger: Logger) {
    this.name = config.name
    this.version = config.version
    this.storePath = config.storePath
    this.logger = logger
  }

  private getStorage(...names: string[]) {
    return path.join(this.storePath, this.name, ...names)
  }

  async clean() {
    if (this.version === 'all') {
      // 删除目录
      const pkgDir = this.getStorage()
      return await removeDir(pkgDir)
    }
    // 删除某些版本

    const metaPath = this.getStorage(META_FILE_NAME)
    if (!exists(metaPath)) {
      // package.json 不存在，删除目录
      const pkgDir = this.getStorage()
      await removeDir(pkgDir)
    }

    // 清除
    await Promise.allSettled([this.cleanMetadata(), this.batchCleanTarball()])
  }

  /** 清除本地 metadata 版本 */
  async cleanMetadata() {
    debug('clean metadata')
    // 获取本地数据
    const metaPath = this.getStorage(META_FILE_NAME)
    const meta = getMetadataLocal(this.name, metaPath)
    const version2Clean = this.version as string[]
    // 本地获取 metadata
    // 移除指定版本
    const tMeta = _.cloneDeep(meta)
    Object.keys(tMeta.versions)
      .filter((v) => version2Clean.includes(v))
      .forEach((v) => {
        delete tMeta.versions[v]
        const distfile = genDistFileName(this.name, v)
        delete tMeta._distfiles[distfile]
      })

    const tMetaJson = stringifyJson(tMeta)
    await streamWriteFile(metaPath, Stream.Readable.from(tMetaJson))
  }

  /**
   * 清除 tarball 文件
   * @param version
   * @returns
   */
  async cleanTarball(version: string) {
    const fileName = `${this.name}-${version}.tgz`
    const tgzFilePath = this.getStorage(fileName)
    await removeFile(tgzFilePath)
  }

  async batchCleanTarball() {
    debug('clean tarballs')
    const versions2Clean = this.version as string[]
    debug('versions to clean: %o', versions2Clean)
    const cleans = versions2Clean.map((v) => {
      return this.cleanTarball(v)
    })
    await Promise.allSettled(cleans)
  }
}
