# wx-we-love-api

情侣恋爱空间小程序后端 API，基于 Express 5 和 Sequelize 6。

## 环境要求

- Node.js 20.17+，推荐 Node.js 22 LTS
- pnpm 11.20+
- MySQL 5.7+/8.0，或本地 SQLite

## 安装与启动

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

生产环境使用 `pnpm start`。启动流程会依次校验环境变量、连接数据库、执行版本化迁移，全部成功后才监听端口。

## 环境变量

```env
NODE_ENV=production
PORT=4000

WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret
JWT_SECRET=replace_with_at_least_32_random_characters

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=wx_we_love
DB_USER=wx_we_love
DB_PASSWORD=your_database_password

# 未配置 DB_HOST 时使用 SQLite
SQLITE_STORAGE=./database.sqlite

API_BASE_URL=https://api.example.com
CORS_ORIGINS=https://admin.example.com
UPLOAD_DIR=./uploads

```

`JWT_SECRET` 至少 32 个字符。生产环境还必须配置 `WX_APPID`、`WX_SECRET` 和 `API_BASE_URL`。`CORS_ORIGINS` 是逗号分隔的浏览器来源；微信小程序请求通常不携带 `Origin`。

## 健康检查

- `GET /health/live`：进程存活，不检查数据库
- `GET /health/ready`：数据库初始化和迁移完成后返回 200
- `GET /health`：兼容别名，语义等同就绪探针

负载均衡和发布检查应使用 `/health/ready`。

## API 概览

除登录接口和健康检查外，业务接口均要求 `Authorization: Bearer <token>`。

### 用户与关系 `/api/user`

- `POST /login`
- `GET /info`
- `POST /info`
- `POST /generate-match-code`
- `POST /match`
- `POST /unmatch`
- `POST /function-order`
- `POST /bind-phone`
- `POST /logout`
- `GET /export-data`
- `POST /delete-account`

匹配码由密码学安全随机数生成，有效期十分钟。匹配和解绑使用数据库事务；解绑保留历史数据并结束当前关系。

### 纪念日 `/api/anniversaries`

- `GET /`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

### 经期记录 `/api/menstrual`

- `GET /`
- `GET /stats/cycle`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`

经期记录只允许创建者本人访问。

### 心情日记 `/api/mood-diary`

- `GET /`
- `GET /all`
- `GET /entry`
- `GET /comments`
- `POST /`
- `POST /comment`
- `DELETE /:id`

### 情侣瞬间 `/api/moments`

- `GET /`
- `POST /`
- `DELETE /:id`

### 上传 `/api/upload`

- `POST /`：`multipart/form-data`，字段名 `file`

上传限制为 5 MB。服务按文件魔数识别 JPEG、PNG、GIF 和 WebP，不信任客户端文件名或 MIME 类型，并按用户隔离存储。

## 数据与迁移

- 首次启动会创建基础表；之后由 `SchemaMigrations` 记录并执行版本化迁移。
- 当前迁移会建立 `Couple`、`Moment` 及关系隔离字段和索引，并回填兼容旧数据。
- 同一用户、同一关系、同一天的重复心情日记会合并，评论会迁移到保留记录。
- 发布涉及数据库变化的版本前，必须备份数据库和 `UPLOAD_DIR`。

## 验证

```bash
pnpm test
pnpm audit --prod
```

测试覆盖鉴权密钥、上传校验、匹配事务、关系隔离、解绑保留、迁移合并和账号删除。

## 项目结构

```text
src/
├── app.js
├── index.js
├── config/
├── database/
├── middleware/
├── models/
├── routes/
├── services/
└── utils/
test/
```

## 相关文档

- [部署文档](../DEPLOYMENT.md)
- [隐私说明](../PRIVACY.md)
- [技术栈与数据模型](./docs/技术栈.md)
- [数据库命令](./docs/数据库命令.md)
- [数据备份](./docs/数据备份.md)

## License

MIT
