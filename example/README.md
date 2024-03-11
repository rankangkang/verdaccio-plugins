# readme

## Quick Start

1. 先构建 verdaccio 镜像

   ```bash
   npm run image -- npm 1.0.0
   ```

2. 填充配置 `conf/config.yaml`

   ```yaml
   plugins: /verdaccio/plugins
   storage: /verdaccio/storage/data

   web:
     title: Verdaccio

   auth:
     # 使用默认的 htpasswd 插件
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
         - singletest
         - verdacciod
         - chrome-devtools-frontend
         - cnpmcore

   middlewares:
     audit:
       enabled: true

   uplinks:
     taobao:
       url: https://registry.npmmirror.com/
       cache: false

   max_body_size: 100mb

   logs:
     - { type: stdout, format: pretty, level: info }

   ```

3. 起一个容器

   ```bash
   docker run -itd \
     --name service-npm \
     -p 4873:4873 \
     -v ${PWD}/example/conf:/verdaccio/conf \
     -v ${PWD}/example/storage:/verdaccio/storage \
     --network npm \
     service-npm:1.0.0
   ```

   或使用 docker-compose 启动，配置示例如下：

   ```yaml
   # docker-compose.yaml
   version: '3.7'
   services:
     service-npm:
       image: service-npm:1.0.0
       container_name: service-npm
       ports:
         - 4873:4873
       environment:
         VERDACCIO_PROTOCOL: http
         VERDACCIO_PORT: 4873
       volumes:
         - ./conf:/verdaccio/conf
         - ./storage:/verdaccio/storage
       restart: always
   ```
