# wx-we-love

情侣恋爱空间微信小程序，包含 Taro 小程序前端和 Express 后端 API。

## 项目结构

```text
wx-we-love/
├── wx-we-love-app/     # Taro + React + TypeScript 小程序
├── wx-we-love-api/     # Express + Sequelize API
├── DEPLOYMENT.md       # 生产部署说明
└── PRIVACY.md          # 数据边界与隐私操作
```

## 主要功能

- 微信登录、限时匹配码、情侣匹配与非破坏性解绑
- 恋爱天数、纪念日、情侣瞬间和心情日记
- 私人经期记录、周期预测和历史记录
- 资料维护、头像与瞬间图片上传
- 服务端退出登录、个人数据导出和账号删除

共享数据以一次情侣关系为边界；解绑会保留历史记录，新伴侣无法看到旧关系数据。经期记录始终仅本人可见。完整规则见 [PRIVACY.md](./PRIVACY.md)。

## 本地开发

要求 Node.js 20.17+ 和 pnpm 11.20+，推荐 Node.js 22 LTS。

### 后端

```bash
cd wx-we-love-api
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

- 存活探针：`GET http://localhost:4000/health/live`
- 就绪探针：`GET http://localhost:4000/health/ready`

服务会先连接数据库并执行版本化迁移，成功后才监听端口。升级已有数据前请先备份数据库和上传目录。

### 前端

```bash
cd wx-we-love-app
pnpm install --frozen-lockfile
TARO_APP_API_BASE_URL=http://127.0.0.1:4000 pnpm dev:weapp
```

使用微信开发者工具打开 `wx-we-love-app`，小程序根目录为 `dist/`。真机调试不能使用 `localhost`，请改为电脑的局域网 IP；生产构建必须使用 HTTPS API 地址。

## 验证

```bash
cd wx-we-love-api
pnpm test
pnpm audit --prod

cd ../wx-we-love-app
pnpm typecheck
pnpm build:weapp
pnpm audit --prod
```

## 文档

- [前端说明](./wx-we-love-app/README.md)
- [后端说明](./wx-we-love-api/README.md)
- [部署文档](./DEPLOYMENT.md)
- [隐私说明](./PRIVACY.md)
