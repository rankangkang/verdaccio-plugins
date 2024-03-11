import {
  Logger,
  IPluginStorage,
  PluginOptions,
  IPackageStorage,
  TokenFilter,
  Token,
  Config,
  onEndSearchPackage,
  onSearchPackage,
  onValidatePackage,
} from '@verdaccio/types'

import { S3_STORAGE_PLUGIN, Backends, VerdaccioConfig } from './config'
import Storage from './storage'
import { LocalDatabase, RemoteDatabase } from './plugins'
import _ from 'lodash'

export default class Database implements IPluginStorage<VerdaccioConfig> {
  logger: Logger
  config: VerdaccioConfig & Config

  localBackend: IPluginStorage<any>
  remoteBackend: IPluginStorage<any>

  constructor(
    config: VerdaccioConfig,
    options: PluginOptions<VerdaccioConfig>
  ) {
    this.logger = options.logger
    this.config = _.cloneDeep(config)

    // 插件初始化
    const localConfig = _.cloneDeep(config)
    // @ts-ignore
    this.localBackend = new LocalDatabase(localConfig, this.logger)

    const remoteConfig = _.cloneDeep(config)
    remoteConfig.store = {
      [S3_STORAGE_PLUGIN]: this.config.remote_backend,
    }
    this.remoteBackend = new RemoteDatabase(remoteConfig, options)
  }

  get backends(): Backends {
    return {
      local: this.localBackend,
      remote: this.remoteBackend,
    }
  }

  /**
   * 新增包到 db，仅写到 OSS
   * @param name
   * @param callback
   */
  add(name: string, callback: Function): void {
    this.remoteBackend.add(name, callback)
  }

  /**
   * 从 db 中移除包
   * @param name
   * @param callback
   */
  remove(name: string, callback: Function): void {
    this.remoteBackend.remove(name, callback)
  }

  /**
   * 获取私有包列表数据，仅从 oss
   * @param callback
   */
  get(callback: Function): void {
    this.remoteBackend.get(callback)
  }

  /**
   * 获取 secret，仅从 oss
   */
  getSecret(): Promise<string> {
    return this.remoteBackend.getSecret()
  }

  /**
   * 设置 secret，仅从 oss
   * @param secret
   * @returns
   */
  setSecret(secret: string): Promise<any> {
    return this.remoteBackend.setSecret(secret)
  }

  /**
   * 返回
   * @param pkgName
   * @returns
   */
  getPackageStorage(pkgName: string): IPackageStorage {
    return new Storage(this.config, pkgName, this.logger, this.backends)
  }

  /**
   * 搜索包
   * @param onPackage
   * @param onEnd
   * @param validateName
   */
  search(
    onPackage: onSearchPackage,
    onEnd: onEndSearchPackage,
    validateName: onValidatePackage
  ): void {
    return this.localBackend.search(onPackage, onEnd, validateName)
  }

  /**
   * 存 token，仅远端
   * @param token
   */
  saveToken(token: Token): Promise<any> {
    return this.remoteBackend.saveToken(token)
  }

  /**
   * 删 token，仅远端
   * @param token
   */
  deleteToken(user: string, tokenKey: string): Promise<any> {
    return this.remoteBackend.deleteToken(user, tokenKey)
  }

  /**
   * 读 token，仅远端
   * @param token
   */
  readTokens(filter: TokenFilter): Promise<Token[]> {
    return this.remoteBackend.readTokens(filter)
  }
}
