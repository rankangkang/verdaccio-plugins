import { Config, IPluginStorage } from '@verdaccio/types'

export interface VerdaccioConfig extends Config {
  /** 远端对象存储配置 */
  remote_backend: any
  /** 本地存储配置 */
  local_backend: any
  private_packages: string[]
}

export type StorageType = 'local' | 'remote'
export type Backends = Record<StorageType, IPluginStorage<any>>

export const S3_STORAGE_PLUGIN = 'aws-s3-storage'
