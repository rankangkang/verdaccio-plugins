# verdaccio-theme-webui

## quick start

- 安装

```bash
pnpm i
```

- 启动调试

```bash
pnpm run start
```

- 联合 verdaccio 启动

```bash
pnpm run verdaccio:server
```

## 项目结构

本项目从 @verdaccio/ui-theme fork 而来，依赖了官方的 @verdaccio/ui-components 库。

## i18n

项目 i18n 配置位于 `src/i18n` 文件夹，i18n 相关详见 `src/i18n/README.md`.

## 配置注入

web 配置会注入到 `window.__VERDACCIO_BASENAME_UI_OPTIONS` 对象中，改对象在浏览器全局上下文中可被访问到。

在插件 react 应用组件中可通过 `@verdaccio/components-ui` 导出的 `useConfig` 钩子获取。

> 注意：仅 web 配置项的配置会注入到 `window.__VERDACCIO_BASENAME_UI_OPTIONS` 对象中，theme 配置无法从该对象获取。

假如有以下配置

```yaml
web:
  foo: webfoo
  bar: webbar

theme:
  webui:
    foo: foo
    bar: bar
```

在 `window.__VERDACCIO_BASENAME_UI_OPTIONS` 仅能访问到 web 配置项注入的配置：

```js
console.log(window.__VERDACCIO_BASENAME_UI_OPTIONS)
// 输出如下：
{
  // ...
  "foo": "webfoo",
  "bar": "webbar"
}
```

theme 插件自己的配置无法在前端获取，配置文件中传入的 theme 配置无法传递到前端页面。

若 theme 插件需要配置，可尝试将主题配置配置 web 配置项下：

```yaml
web:
  # ...
  # 以下配置可以通过 window.__VERDACCIO_BASENAME_UI_OPTIONS.webui 访问
  webui: # webui theme 配置
    foo: foo
    bar: bar

theme:
  webui:
    # 以下配置在前端应用中无法访问到
    foo: foo
    bar: bar
```
