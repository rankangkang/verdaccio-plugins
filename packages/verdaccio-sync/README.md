# local-sync

插件从上游同步公有包版（元数据与tgz文件）本到本地，使得关闭`packages`配置后（关闭上游），也可继续拉包。

## 配置

```yaml
middlewares:
  sync:
    enable_sync: true
    enable_clean: true
    uplink: https://registry.npmmirror.com/
    store_path: /verdaccio/storage/data
```
