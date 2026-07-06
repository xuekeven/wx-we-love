# wx-we-love-app

情侣恋爱空间微信小程序前端（Taro + React + TypeScript）。

## 项目概览

本项目为微信小程序端，已接入后端 API，当前包含登录匹配、主页、纪念日、经期记录、心情日记、个人中心等核心功能页面。

当前路由入口见 `src/app.config.ts`，主要页面包括：

- `pages/login`：微信登录
- `pages/match`：匹配页面
- `pages/index`：首页
- `pages/anniversary`：纪念日
- `pages/menstrual`：经期记录
- `pages/mood-diary`：心情日记
- `pages/my`：我的

## 技术栈

- 框架：Taro `3.6.23`
- UI：React `18`
- 语言：TypeScript
- 样式：Sass
- 构建：Webpack 5

## 环境要求

- Node.js 16+
- npm 8+
- 微信开发者工具（用于预览/调试）

## 安装与运行

```bash
npm install
```

### 小程序开发模式

```bash
npm run dev:weapp
```

### 小程序生产构建

```bash
npm run build:weapp
```

### H5 调试与构建（可选）

```bash
npm run dev:h5
npm run build:h5
```

## 后端 API 配置

前端 API 基址配置在 `src/config.js`。

- `development`：默认仍指向 `https://www.kaitool.top/welove`
- `production`：默认指向 `https://www.kaitool.top/welove`

如需本地联调，可改为局域网地址（真机不能访问 `localhost`）：

```js
development: {
  apiBaseUrl: 'http://192.168.x.x:4000'
}
```

生产发布前，请确认：

- `production.apiBaseUrl` 是正式 HTTPS API 地址
- 该域名已添加到微信公众平台的 request 合法域名
- 后端 `/health` 可通过公网 HTTPS 访问

## 目录结构

```text
wx-we-love-app/
├── src/
│   ├── app.tsx
│   ├── app.config.ts
│   ├── config.js                  # API 地址配置
│   ├── pages/                     # 业务页面
│   │   ├── login/
│   │   ├── match/
│   │   ├── index/
│   │   ├── anniversary/
│   │   ├── menstrual/
│   │   ├── mood-diary/
│   │   ├── moment/
│   │   └── my/
│   ├── components/                # 公共组件
│   ├── store/                     # 全局状态
│   └── utils/                     # 请求与工具方法
├── config/                        # Taro 构建配置
└── package.json
```

## 与后端协作

后端项目位于仓库 `wx-we-love-api`，默认端口 `4000`，主要接口前缀：

- `/api/user`
- `/api/anniversaries`
- `/api/menstrual`
- `/api/mood-diary`
- `/api/upload`

## 小程序发布

```bash
npm ci
npm run build:weapp
```

构建产物在 `dist/`。使用微信开发者工具打开本项目，确认 `project.config.json` 中的 `appid` 正确后上传版本，并在微信公众平台提交审核。

完整部署流程见仓库根目录 [DEPLOYMENT.md](../DEPLOYMENT.md)。

## 许可证

MIT
