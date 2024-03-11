import VerdaccioLocalDatabase from '@verdaccio/local-storage'
import VerdaccioLocalStorage from '@verdaccio/local-storage/lib/local-fs'
import { Config, Logger } from '@verdaccio/types'
import _ from 'lodash'
import fs from 'fs'
import path from 'path'
import { ReadTarball, UploadTarball } from '@verdaccio/streams'

/**
 * 扩展 hasTarball 的 localStorage
 */
export class LocalStorage extends VerdaccioLocalStorage {
  constructor(packageName: string, logger: Logger) {
    super(packageName, logger)
  }

  /**
   * 是否存在目录/文件
   * @param fileName
   * @returns
   */
  public hasTarball(fileName?: string) {
    try {
      // @ts-ignore
      const pathName: string = this._getStorage(fileName)
      fs.accessSync(pathName)
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * 从远端同步 tarball
   * @param tarballName
   */
  public syncTarball(tarballName: string, rs: ReadTarball) {
    if (this.hasTarball(tarballName)) {
      // 返回
      throw new Error('[local-s3] tarball path already exist')
    }

    try {
      // @ts-ignore
      const pathName = this._getStorage()
      if (!this.hasTarball()) {
        fs.mkdirSync(pathName, { recursive: true })
      }

      const uploadStream = this.writeTarball(tarballName) as UploadTarball
      // rs.pipe(uploadStream)

      rs.on('error', (err) => {
        // 不要 emit error，未经处理的错误会引发程序崩溃
        uploadStream.abort()
        this.logger.error(
          { tarballName, error: err.message },
          '[local-s3] sync tarball @{tarballName} error: @{error}'
        )
      })

      // 必需，监听 on 事件
      rs.on('end', () => {
        uploadStream.done()
        this.logger.debug(
          { tarballName },
          '[local-s3] end sync tarball @{tarballName}'
        )
      })

      rs.on('success', () => {
        uploadStream.done()
        this.logger.debug(
          { tarballName },
          '[local-s3] end sync tarball @{tarballName}'
        )
      })

      rs.on('open', () => {
        // 开启 pipe
        rs.pipe(uploadStream)
        this.logger.debug(
          { tarballName },
          '[local-s3] start sync tarball @{tarballName}'
        )
      })

      // emit 的错误必须处理
      // uploadStream.on('error', () => {
      //   this.logger.error({}, '[local-s3] sync tarball from remote error')
      //   uploadStream.abort()
      // })
    } catch (error) {
      this.logger.error(
        { error: (error as any).message },
        '[local-s3] sync tarball error: @{error}'
      )
    }
  }
}

export class LocalDatabase extends VerdaccioLocalDatabase {
  constructor(config: Config, logger: Logger) {
    super(config, logger)
  }

  public getPackageStorage(packageName: string) {
    const packageAccess = this.config.getMatchedPackagesSpec(packageName)

    // @ts-ignore
    const packagePath: string = this._getLocalStoragePath(
      packageAccess ? packageAccess.storage : undefined
    )

    if (_.isString(packagePath) === false) {
      return
    }

    const packageStoragePath: string = path.join(
      path.resolve(path.dirname(this.config.self_path || ''), packagePath),
      packageName
    )

    return new LocalStorage(packageStoragePath, this.logger)
  }
}
