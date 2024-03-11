# local-s3 插件

插件将公有包 元数据/tgz 文件缓存到本地，以加快访问速度；私有包数据存储到 s3，拉包时直接从 s3 获取。

## 配置

```yaml
# 在 store 配置项下进行
store:
  local-s3:
    local_backend:
    remote_backend:
      bucket: your_bucket
      endpoint: your_s3_bucket
      accessKeyId: your_ak
      secretAccessKey: your_sk
    private_packages:
      - "@test/*"
      - verdaccio
      - chrome-devtools-frontend
      - cnpmcore
```
