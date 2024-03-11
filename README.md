# verdaccio-plugins

verdaccio 改造需要的插件合集：

## Quick Start

首先进行镜像构建：

```bash
npm run image -- npm 1.0.0
```

启动服务：

```bash
# 赋予权限
sudo chown --recursive 10001:65533 ${PWD}/storage

# 创建网络
docker network create npm
# 添加容器至已有网络
docker network connect npm service-npm

docker run -it \
  --name service-npm \
  -p 8089:4873 \
  -v ${PWD}/example/conf:/verdaccio/conf \
  -v ${PWD}/example/storage:/verdaccio/storage \
  --network npm \
  service-npm:1.0.0

```

### 配置文件示例

```yaml
plugins: /verdaccio/plugins
storage: /verdaccio/storage/data

web:
  title: Verdaccio

auth:
  htpasswd:
    file: /verdaccio/storage/htpasswd

store:
  # local-s3 插件
  local-s3:
    local_backend:
    # remote 远端存储配置
    remote_backend:
      bucket: your-bucket
      endpoint: your_s3_endpoint
      accessKeyId: your-access-key
      secretAccessKey: your-secret-key
    # 私有包配置
    private_packages:
      - "@test/*"
      - "@kk/*"

middlewares:
  audit:
    enabled: true

uplinks:
  taobao:
    url: https://registry.npmmirror.com/
    cache: false

# 默认 auth 插件权限配置 fallback
packages:
  "@test/*":
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated
  "@kk/*":
    access: $authenticated
    publish: $authenticated
    unpublish: $authenticated
  "**":
    access: $authenticated
    # publish: $anonymous
    # unpublish: $all
    proxy: taobao

max_body_size: 100mb

logs:
  - { type: stdout, format: pretty, level: info }

```

注意，移除 packages 配置后将失去上游代理能力。

