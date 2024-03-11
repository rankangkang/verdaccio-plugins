import {
  Logger,
  ILocalPackageManager,
  StorageUpdateCallback,
  PackageTransformer,
  StorageWriteCallback,
  CallbackAction,
  Package,
  ReadPackageCallback,
  IReadTarball,
  IUploadTarball,
} from '@verdaccio/types'
import micromatch from 'micromatch'

import { Backends, VerdaccioConfig } from './config'
import { LocalStorage, RemoteStorage } from './plugins'

/**
 * 新增 private_packages 配置项，对包名进行过滤
 * 匹配上私有包名的包，存储在 remote，否则存储在 local
 */
export default class Storage implements ILocalPackageManager {
  public config: VerdaccioConfig
  public logger: Logger
  public packageName: string
  public privatePackages: string[]

  public remoteStorage: RemoteStorage
  public localStorage: LocalStorage

  constructor(
    config: VerdaccioConfig,
    packageName: string,
    logger: Logger,
    backends: Backends
  ) {
    this.config = config
    this.privatePackages = config.private_packages || []
    this.packageName = packageName
    this.logger = logger

    this.localStorage = backends.local.getPackageStorage(
      packageName
    ) as LocalStorage

    this.remoteStorage = backends.remote.getPackageStorage(
      packageName
    ) as RemoteStorage
  }

  /**
   * 判断包是否为私有包
   * @param name
   * @returns
   */
  private isPrivate(name: string): boolean {
    if (this.privatePackages.length === 0) {
      return false
    }
    return micromatch.isMatch(name, [...this.privatePackages])
  }

  /**
   * 写 tgz 文件，目前只写入本地
   * @param tarballName
   * 参照 https://github.com/verdaccio/monorepo/blob/6d9b7091417c79bf661a8a756f777e3b0ff78aa5/plugins/aws-s3-storage/src/s3PackageManager.ts#L271
   */
  writeTarball(tarballName: string): IUploadTarball {
    if (!this.isPrivate(this.packageName)) {
      this.logger.debug(
        { tarballName },
        '[local-s3] write tarball @{tarballName} to localStorage'
      )
      return this.localStorage.writeTarball(tarballName)
    }
    this.logger.debug(
      { tarballName },
      '[local-s3] write tarball @{tarballName} to remoteStorage'
    )
    return this.remoteStorage.writeTarball(tarballName)
  }

  /**
   * 读取 tgz 文件，先从 local 读取，local 不存在时，从 s3 下载，并同步到 local
   * @param tarballName
   * 参照 https://github.com/verdaccio/monorepo/blob/6d9b7091417c79bf661a8a756f777e3b0ff78aa5/plugins/aws-s3-storage/src/s3PackageManager.ts#L421
   */
  readTarball(tarballName: string): IReadTarball {
    // 公有包
    if (!this.isPrivate(this.packageName)) {
      this.logger.debug(
        { tarballName },
        '[local-s3] read tarball @{tarballName} from localStorage'
      )
      return this.localStorage.readTarball(tarballName)
    }

    // 私有包
    if (this.localStorage.hasTarball(tarballName)) {
      this.logger.debug(
        { tarballName },
        '[local-s3] read tarball @{tarballName} from localStorage'
      )
      const rs = this.localStorage.readTarball(tarballName)
      return rs
    }

    this.logger.debug(
      { tarballName },
      '[local-s3] read tarball @{tarballName} from remoteStorage'
    )
    // 从 remote 获取
    const rs = this.remoteStorage.readTarball(tarballName)
    // 同步到本地
    this.localStorage.syncTarball(tarballName, rs)
    return rs
  }

  /**
   * 读取包元数据（package.json）
   * @param pkgName
   * @param callback
   */
  readPackage(pkgName: string, callback: ReadPackageCallback) {
    if (!this.isPrivate(pkgName)) {
      this.logger.debug(
        { pkgName },
        '[local-s3] local storage read package @{pkgName}'
      )
      return this.localStorage.readPackage(pkgName, callback)
    }
    this.logger.debug(
      { pkgName },
      '[local-s3] remote storage read package @{pkgName}'
    )
    return this.remoteStorage.readPackage(pkgName, callback)
  }

  /**
   * 创建包
   * @param pkgName
   * @param value
   * @param cb
   */
  createPackage(pkgName: string, value: Package, callback: CallbackAction) {
    if (!this.isPrivate(pkgName)) {
      this.logger.debug(
        { pkgName },
        '[local-s3] local storage create package @{pkgName}'
      )
      return this.localStorage.createPackage(pkgName, value, callback)
    }
    this.logger.debug(
      { pkgName },
      '[local-s3] remote storage create package @{pkgName}'
    )
    return this.remoteStorage.createPackage(pkgName, value, callback)
  }

  /**
   * 保存包的 revision 信息
   * @param pkgName
   * @param json
   * @param callback
   */
  savePackage(pkgName: string, json: Package, callback: CallbackAction) {
    if (!this.isPrivate(pkgName)) {
      this.logger.debug(
        { pkgName },
        '[local-s3] local storage save package @{pkgName}'
      )
      return this.localStorage.savePackage(pkgName, json, callback)
    }
    this.logger.debug(
      { pkgName },
      '[local-s3] remote storage save package @{pkgName}'
    )
    return this.remoteStorage.savePackage(pkgName, json, callback)
  }

  /**
   * 新增一个包版本
   * @param pkgFileName
   * @param updateHandler
   * @param onWrite
   * @param transformPackage
   * @param onEnd
   */
  updatePackage(
    name: string,
    updateHandler: StorageUpdateCallback,
    onWrite: StorageWriteCallback,
    transformPackage: PackageTransformer,
    onEnd: CallbackAction
  ) {
    if (!this.isPrivate(this.packageName)) {
      this.logger.debug(
        { name },
        '[local-s3] local storage update package @{name}'
      )
      return this.localStorage.updatePackage(
        name,
        updateHandler,
        onWrite,
        transformPackage,
        onEnd
      )
    }
    this.logger.debug(
      { name },
      '[local-s3] remote storage update package @{name}'
    )
    return this.remoteStorage.updatePackage(
      name,
      updateHandler,
      onWrite,
      transformPackage,
      onEnd
    )
  }

  /**
   * 删除文件指定文件
   * @param fileName
   * @param callback
   */
  deletePackage(fileName: string, callback: CallbackAction) {
    if (!this.isPrivate(this.packageName)) {
      this.logger.debug(
        { fileName },
        '[local-s3] local storage delete package @{fileName}'
      )
      return this.localStorage.deletePackage(fileName, callback)
    }

    // 先删本地，再删远端
    process.nextTick(() => {
      if (this.localStorage.hasTarball(fileName)) {
        this.logger.debug(
          { fileName },
          '[local-s3] local storage delete package @{fileName}'
        )
        this.localStorage.deletePackage(fileName, (err) => {
          if (err) {
            this.logger.error(
              { fileName, error: err?.message },
              '[local-s3] local storage delete package @{fileName} error: @{error}'
            )
          }
        })
      }
    })

    this.logger.debug(
      { fileName },
      '[local-s3] remote storage delete package @{fileName}'
    )
    return this.remoteStorage.deletePackage(fileName, callback)
  }

  /**
   * 移除文件路径，将会删除包的路径下的所有文件，完全删除一个包
   * @param callback
   */
  removePackage(callback: CallbackAction): void {
    if (!this.isPrivate(this.packageName)) {
      this.logger.debug(
        { name: this.packageName },
        '[local-s3] local storage remove package @{name}'
      )
      return this.localStorage.removePackage(callback)
    }

    process.nextTick(() => {
      // 先删本地
      if (this.localStorage.hasTarball()) {
        this.logger.debug(
          { name: this.packageName },
          '[local-s3] local storage remove package @{name}'
        )
        this.localStorage.removePackage((err) => {
          if (err) {
            this.logger.error(
              { name: this.packageName, error: err?.message },
              '[local-s3] local storage delete package @{name} error: @{error}'
            )
          }
        })
      }
    })

    this.logger.debug(
      { name: this.packageName },
      '[local-s3] remote storage remove package @{name}'
    )
    return this.remoteStorage.removePackage(callback)
  }
}
