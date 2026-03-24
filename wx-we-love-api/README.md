# wx-we-love-api

情侣恋爱空间小程序后端 API 服务（Express + Sequelize）。

## 项目概览

服务入口为 `src/index.js`，默认端口 `4000`。当前已实现：

- 微信登录与 JWT 鉴权
- 情侣匹配/解绑
- 用户资料管理（昵称、头像、恋爱日期、功能排序、手机号）
- 纪念日管理
- 经期记录管理
- 心情日记（列表、写入、删除、评论、已读状态）
- 图片上传（头像等）

## 技术栈

- Node.js + Express
- Sequelize ORM
- 数据库：MySQL（配置 `DB_HOST` 时）或 SQLite（默认）
- 鉴权：JWT
- 文件上传：Multer

## 环境要求

- Node.js 16+
- npm 8+

## 安装与启动

```bash
npm install
```

### 开发模式（自动重启）

```bash
npm run dev
```

### 生产模式

```bash
npm start
```

### 启动验证

- `GET /`：服务信息
- `GET /health`：健康检查

## 环境变量

项目未提供 `.env.example`，请手动创建 `.env`。常用变量如下：

```env
# 服务端口
PORT=4000

# 微信登录（强烈建议配置）
WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret

# JWT（建议务必配置）
JWT_SECRET=your_jwt_secret

# MySQL（配置 DB_HOST 后启用 MySQL）
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=wx_we_love
DB_USER=root
DB_PASSWORD=your_password

# 未配置 DB_HOST 时使用 SQLite 文件
SQLITE_STORAGE=./database.sqlite

# 生成图片 URL 的基础域名（可选）
BASE_URL=https://www.kaitool.top/welove
```

## API 概览

基础路由：

- `GET /`
- `GET /health`

用户与匹配（`/api/user`）：

- `POST /login`
- `GET /info`
- `POST /info`
- `POST /generate-match-code`
- `POST /match`
- `POST /unmatch`
- `POST /function-order`
- `POST /bind-phone`

纪念日（`/api/anniversaries`）：

- `GET /`
- `POST /`
- `DELETE /:id`

经期记录（`/api/menstrual`）：

- `GET /`
- `GET /:id`
- `POST /`
- `PUT /:id`
- `DELETE /:id`
- `GET /stats/cycle`

心情日记（`/api/mood-diary`，需鉴权）：

- `GET /`
- `GET /all`
- `GET /entry`
- `GET /comments`
- `POST /`
- `POST /comment`
- `DELETE /:id`

上传（`/api/upload`）：

- `POST /`（`multipart/form-data`，字段名 `file`）

## 鉴权说明

多数业务接口通过 `Authorization: Bearer <token>` 传递 JWT。  
`/api/user/login` 登录成功后会返回 `token`。

## 响应格式

成功示例：

```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

失败示例：

```json
{
  "success": false,
  "message": "错误信息"
}
```

## 数据库说明

- 默认使用 SQLite 文件库（`database.sqlite`），并非内存库
- 配置 `DB_HOST` 后会自动切换为 MySQL
- 启动时执行 `sequelize.sync({ alter: true })`，会按模型同步表结构

## 项目结构

```text
wx-we-love-api/
├── src/
│   ├── index.js
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   │   ├── user.js
│   │   ├── anniversary.js
│   │   ├── menstrual.js
│   │   ├── moodDiary.js
│   │   └── upload.js
│   └── utils/
├── uploads/              # 运行后自动创建
└── package.json
```

## 相关文档

- `启动说明.md`
- `数据库使用指南.md`
- `数据模型说明.md`
- `服务器部署指南.md`

## License

MIT

