FROM verdaccio/verdaccio:5.29
ARG imageCode
ARG imageTag

USER root

# RUN apk add git
# RUN apk add --no-cache bash

ADD . /opt/verdaccio-plugins
WORKDIR /opt/verdaccio-plugins

RUN mkdir -p /verdaccio/plugins
# 安装 pnpm
RUN set -e && npm config set registry https://registry.npmmirror.com/ \
    && npm install pnpm -g \
    && pnpm install \
    && pnpm run build \
    # link 到全局目录以供引用
    && pnpm run link
