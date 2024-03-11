import { Config } from '@verdaccio/types'

/**
 * 默认路由监听
 */
export const DEFAULT_SYNC_ROUTE = '/-/sync'
export const DEFAULT_UPLINK = 'https://registry.npmjs.org/'
export const META_FILE_NAME = 'package.json'
export const STORE_DIR_NAME = 'storage'
export const DEFAULT_CLEAN_ROUTE = '/-/clean'

export interface SyncConfig {
  /** 是否开启路由监听 */
  enable_sync: boolean
  /** 同步路由监听路径 */
  sync_route: string
  /** uplink：指定上游，可选，默认为 npm */
  uplink: string
  /** 本地存储目录 */
  store_path: string

  /** 是否开启 clean 路由监听 */
  enable_clean: boolean
  /** clean 接口路由 */
  clean_route: string
}

/**
 * merge 后的 verdaccio 配置
 */
export type VerdaccioSyncConfig = Config & SyncConfig

/**
 * 仅需同步 tarball
 */
export interface ISyncRequest {
  name: string
  /** 同步版本，all 代表同步全部 */
  version: string[] | 'all'
  /** 可指定上游 */
  uplink?: string
  /** 是否同步 tgz */
  syncTarball?: boolean
}

export interface ICleanRequest {
  name: string
  version: string[] | 'all'
}
