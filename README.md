# wx-we-love

情侣恋爱空间微信小程序，包含 Taro 小程序前端和 Express 后端 API。

## 项目结构

```text
wx-we-love/
├── wx-we-love-app/     # 小程序前端，Taro + React + TypeScript
├── wx-we-love-api/     # 后端 API，Express + Sequelize
└── DEPLOYMENT.md       # 部署文档
```

## 主要功能

- 微信登录、情侣匹配与解绑
- 首页恋爱天数展示
- 心情日记：日历记录、心情选择、日记列表、评论
- 经期记录：日历记录、周期预测、阶段说明、历史记录
- 纪念日管理
- 个人中心、资料维护、头像上传

## 本地开发

### 后端

```bash
cd wx-we-love-api
npm install
cp .env.example .env
npm run dev
```

默认监听 `http://localhost:4000`，健康检查地址为 `GET /health`。

### 前端

```bash
cd wx-we-love-app
npm install
npm run dev:weapp
```

使用微信开发者工具打开 `wx-we-love-app`，小程序根目录为 `dist/`。

前端 API 地址在 `wx-we-love-app/src/config.js` 中配置。真机调试本地后端时不能使用 `localhost`，需要改成电脑局域网 IP。

## 部署

完整部署步骤见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 文档

- [前端说明](./wx-we-love-app/README.md)
- [后端说明](./wx-we-love-api/README.md)
- [部署文档](./DEPLOYMENT.md)

