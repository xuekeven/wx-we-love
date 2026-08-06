# wx-we-love-app

情侣恋爱空间微信小程序前端，基于 Taro 4、React 18 和 TypeScript。

## 功能

- 微信登录、限时匹配码、匹配与解绑
- 首页恋爱天数与功能导航
- 纪念日新增、编辑、删除和倒计时
- 私人经期记录与周期预测
- 关系隔离的心情日记、评论和情侣瞬间
- 资料维护、图片上传、退出登录、数据导出和账号删除

## 环境要求

- Node.js 20.17+，推荐 Node.js 22 LTS
- pnpm 11.20+
- 微信开发者工具
- 可访问的后端 API

## 安装与开发

```bash
pnpm install --frozen-lockfile
TARO_APP_API_BASE_URL=http://127.0.0.1:4000 pnpm dev:weapp
```

真机不能访问电脑的 `localhost`，本地联调请使用电脑局域网 IP。

## API 配置

`src/config.ts` 从 `TARO_APP_API_BASE_URL` 读取 API 基址：

```bash
TARO_APP_API_BASE_URL=https://api.example.com pnpm build:weapp
```

生产构建要求 HTTPS。正式域名还必须加入微信公众平台的 request 合法域名。

## 验证与构建

```bash
pnpm typecheck
TARO_APP_API_BASE_URL=https://api.example.com pnpm build:weapp
pnpm audit --prod
```

构建产物位于 `dist/`，使用微信开发者工具预览和上传。

Taro 4.2.1 对部分构建依赖使用精确版本。项目对已确认兼容的 Swiper 和 UUID 安全版本做了覆盖；不能兼容升级的告警应按构建链风险处理：仅从可信锁文件安装依赖，不向局域网或公网暴露开发服务器，并在 Taro 发布兼容更新后及时升级。不要执行会把 Taro 强制降级到 3.x 的 `pnpm audit --fix --force`。

## 目录结构

```text
src/
├── app.tsx
├── app.config.ts
├── config.ts
├── components/
├── pages/
├── store/
└── utils/
config/
```

## 发布检查

- 后端 `/health/ready` 返回 200。
- `TARO_APP_API_BASE_URL` 指向正式 HTTPS API。
- `pnpm typecheck` 与 `pnpm build:weapp` 通过。
- 微信开发者工具中验证登录、匹配、纪念日、日记、瞬间、上传和隐私操作。
- `project.config.json` 使用正式 AppID，`project.private.config.json` 不提交到 Git。

完整流程见 [DEPLOYMENT.md](../DEPLOYMENT.md)，数据规则见 [PRIVACY.md](../PRIVACY.md)。

## License

MIT
