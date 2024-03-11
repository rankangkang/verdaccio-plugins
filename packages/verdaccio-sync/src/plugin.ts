import {
  Logger,
  IPluginMiddleware,
  IBasicAuth,
  IStorageManager,
  PluginOptions,
} from '@verdaccio/types'
import express, { Request, Response, NextFunction, Application } from 'express'

import {
  VerdaccioSyncConfig,
  DEFAULT_SYNC_ROUTE,
  ISyncRequest,
  DEFAULT_UPLINK,
  STORE_DIR_NAME,
  DEFAULT_CLEAN_ROUTE,
  ICleanRequest,
} from './config'
import UplinkSync from './sync'
import _ from 'lodash'
import path from 'path'
import createDebug from 'debug'
import { LocalClean } from './clean'

const debug = createDebug('sync')

export default class VerdaccioSyncMiddlewarePlugin
  implements IPluginMiddleware<any>
{
  private readonly logger: Logger
  private readonly config: VerdaccioSyncConfig

  constructor(
    config: VerdaccioSyncConfig,
    options: PluginOptions<VerdaccioSyncConfig>
  ) {
    this.logger = options.logger
    this.config = config
    if (!this.config.sync_route) {
      this.config.sync_route = DEFAULT_SYNC_ROUTE
    }
    if (!this.config.uplink) {
      this.config.uplink = DEFAULT_UPLINK
    }
    if (!this.config.store_path) {
      this.config.store_path = path.join(process.cwd(), STORE_DIR_NAME)
    }
    if (!this.config.clean_route) {
      this.config.clean_route = DEFAULT_CLEAN_ROUTE
    }
  }

  private get enableSync() {
    return !!this.config.enable_sync
  }

  private get storePath() {
    return this.config.store_path
  }

  private get syncRoute() {
    return this.config.sync_route
  }

  private get uplink() {
    return this.config.uplink
  }

  private get enableClean() {
    return !!this.config.enable_clean
  }

  private get cleanRoute() {
    return this.config.clean_route
  }

  /**
   * 注册路由
   * @param app
   * @param auth
   * @param storage
   */
  register_middlewares(
    app: Application,
    _auth: IBasicAuth<any>,
    _storage: IStorageManager<any>
  ): void {
    app.use(express.json())

    if (this.enableSync) {
      debug('sync enabled, route: %s', this.syncRoute)
      this.logger.info(
        { route: this.syncRoute },
        'sync enabled, route: @{route}'
      )
      app.post(this.syncRoute, this.can.bind(this), this.sync.bind(this))
    }

    if (this.enableClean) {
      debug('clean enabled, route: %s', this.cleanRoute)
      this.logger.info(
        { route: this.cleanRoute },
        'clean enabled, route: @{route}'
      )
      app.post(this.cleanRoute, this.can.bind(this), this.clean.bind(this))
    }
  }

  /**
   * 判断当前请求是否允许
   * @param req
   * @param res
   * @param next
   */
  private can(req: Request, res: Response, next: NextFunction) {
    debug(
      'incomming request: url: %s, method: %s, body: %o',
      req.url,
      req.method,
      req.body
    )
    this.logger.info(
      { url: req.url, method: req.method, body: req.body },
      'incomming request: url: @{url}, method: @{method}, body: @{body}'
    )
    next()
  }

  /**
   * 同步中间件
   * @param req
   * @param res
   * @param next
   */
  private async sync(req: Request, res: Response, _next: NextFunction) {
    const {
      name,
      version,
      syncTarball = false,
      uplink = this.uplink,
    } = req.body as ISyncRequest

    if (!name || !version) {
      res.status(403).json({
        stat: 'fail',
        msg: 'invalid name or version',
      })
    }

    try {
      const syncer = new UplinkSync(
        {
          name,
          version,
          uplink,
          storePath: this.storePath,
        },
        this.logger
      )
      // localStorage 不用存储 tgz 文件，会在本地找不到时从 url 获取
      const meta = await syncer.syncMetadata()
      // 同步 tgz 文件
      if (syncTarball) {
        await syncer.batchSyncTarball(meta)
      }

      res.status(200).json({ stat: 0, msg: 'sync success' })
    } catch (error) {
      res
        .status(500)
        .json({ stat: 500, msg: `sync failed: ${(error as Error)?.message}` })
    }
  }

  /**
   * 清理中间件
   * @param req
   * @param res
   * @param _next
   */
  private async clean(req: Request, res: Response, _next: NextFunction) {
    const { name, version } = req.body as ICleanRequest
    try {
      const cleaner = new LocalClean(
        { name, version, storePath: this.storePath },
        this.logger
      )
      await cleaner.clean()
      res.status(200).json({ stat: 0, msg: 'clean success' })
    } catch (error) {
      res
        .status(500)
        .json({ stat: 500, msg: `clean failed: ${(error as Error).message}` })
    }
  }
}
