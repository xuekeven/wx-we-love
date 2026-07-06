# wx-we-love 部署文档

本文档用于把 `wx-we-love` 部署到生产环境。项目由两部分组成：

- 后端 API：`wx-we-love-api`，部署到服务器，通过 HTTPS 域名对外提供接口
- 微信小程序：`wx-we-love-app`，本地构建后用微信开发者工具上传

## 1. 部署前准备

### 服务器要求

- Linux 服务器，建议 1C1G 起步
- Node.js 16+，建议 Node.js 18 LTS
- npm 8+
- MySQL 5.7+/8.0，或使用 SQLite 文件库
- Nginx
- PM2
- 已备案并可访问的 HTTPS 域名

微信小程序正式环境要求接口域名必须是 HTTPS，并且需要在微信公众平台配置为合法 request 域名。

### 本地工具

- Node.js 16+
- 微信开发者工具
- 小程序 AppID

## 2. 后端 API 部署

以下示例假设：

- 项目部署目录：`/var/www/wx-we-love`
- API 监听端口：`4000`
- API 对外路径：`https://example.com/welove`

### 2.1 拉取代码

```bash
cd /var/www
git clone <your-repo-url> wx-we-love
cd /var/www/wx-we-love/wx-we-love-api
```

如果是手动上传代码，也请保证目录结构与仓库一致。

### 2.2 安装依赖

```bash
npm ci
```

如果没有 `package-lock.json` 或安装失败，可改用：

```bash
npm install
```

### 2.3 配置环境变量

复制示例文件：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
NODE_ENV=production
PORT=4000

WX_APPID=your_wechat_appid
WX_SECRET=your_wechat_secret
JWT_SECRET=replace_with_a_long_random_secret

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=wx_we_love
DB_USER=wx_we_love
DB_PASSWORD=your_database_password

BASE_URL=https://example.com/welove
```

如果暂时使用 SQLite，可不配置 `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`，并设置：

```env
SQLITE_STORAGE=./database.sqlite
```

生产环境更推荐 MySQL。SQLite 需要额外注意备份 `database.sqlite` 文件。

### 2.4 初始化数据库

MySQL 示例：

```sql
CREATE DATABASE wx_we_love DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wx_we_love'@'%' IDENTIFIED BY 'your_database_password';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_we_love'@'%';
FLUSH PRIVILEGES;
```

服务启动时会执行 `sequelize.sync()` 创建缺失表。当前项目没有完整迁移系统，升级生产库前建议先备份数据库。

### 2.5 启动服务

先本地试启动：

```bash
npm start
```

另开终端验证：

```bash
curl http://127.0.0.1:4000/health
```

返回 `status: ok` 后，使用 PM2 守护进程：

```bash
npm install -g pm2
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status
pm2 logs wx-we-love-api
pm2 restart wx-we-love-api
pm2 stop wx-we-love-api
```

## 3. Nginx 反向代理

如果希望接口路径为 `https://example.com/welove`，可使用如下配置：

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/example.com/privkey.pem;

    client_max_body_size 20m;

    location /welove/ {
        proxy_pass http://127.0.0.1:4000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```bash
nginx -t
systemctl reload nginx
```

验证：

```bash
curl https://example.com/welove/health
```

如果使用根路径部署 API，例如 `https://api.example.com`，则前端 `apiBaseUrl` 应配置为 `https://api.example.com`，Nginx `location /` 代理到 `http://127.0.0.1:4000/`。

## 4. 微信公众平台配置

进入微信公众平台：

1. 开发管理
2. 开发设置
3. 服务器域名
4. request 合法域名添加你的 HTTPS API 域名

示例：

```text
https://example.com
```

微信域名配置通常只填域名，不填具体路径 `/welove`。

## 5. 前端小程序部署

### 5.1 配置 API 地址

编辑：

```text
wx-we-love-app/src/config.js
```

确认生产环境地址：

```js
production: {
  apiBaseUrl: 'https://example.com/welove'
}
```

如果你后端部署在根路径，则填根域名，例如：

```js
apiBaseUrl: 'https://api.example.com'
```

### 5.2 安装依赖并构建

```bash
cd wx-we-love-app
npm ci
npm run build:weapp
```

构建产物在：

```text
wx-we-love-app/dist/
```

### 5.3 微信开发者工具上传

1. 用微信开发者工具打开 `wx-we-love-app`
2. 确认 `project.config.json` 中的 `appid` 是你的正式小程序 AppID
3. 点击“编译”，确认接口请求正常
4. 点击“上传”
5. 在微信公众平台提交审核
6. 审核通过后发布

## 6. 上传文件与静态资源

后端上传文件默认保存到：

```text
wx-we-love-api/uploads/
```

接口通过 `/uploads/xxx` 暴露静态文件。生产环境需要保证：

- `uploads/` 目录有写权限
- 该目录不要随发版被删除
- 定期备份该目录
- `BASE_URL` 配置为外部可访问的 HTTPS 地址

## 7. 日常发布流程

### 后端发布

```bash
cd /var/www/wx-we-love
git pull
cd wx-we-love-api
npm ci
pm2 restart wx-we-love-api
curl https://example.com/welove/health
```

涉及数据库结构变化时，发布前先备份数据库。

### 前端发布

```bash
cd wx-we-love-app
npm ci
npm run build:weapp
```

然后使用微信开发者工具上传新版本。

## 8. 备份建议

MySQL：

```bash
mysqldump -u wx_we_love -p wx_we_love > wx_we_love_$(date +%F).sql
```

SQLite：

```bash
cp wx-we-love-api/database.sqlite wx_we_love_database_$(date +%F).sqlite
```

上传目录：

```bash
tar -czf uploads_$(date +%F).tar.gz wx-we-love-api/uploads
```

## 9. 常见问题

### 小程序真机请求失败

- 确认 `src/config.js` 的 `production.apiBaseUrl` 是 HTTPS
- 确认微信公众平台已配置合法 request 域名
- 确认证书有效，不能是自签证书
- 本地真机调试不能访问 `localhost`

### 登录失败

- 检查 `.env` 中 `WX_APPID`、`WX_SECRET`
- 确认小程序 AppID 与后端配置一致
- 查看 `pm2 logs wx-we-love-api`

### 图片无法显示

- 检查 `uploads/` 目录是否存在且可读写
- 检查 `BASE_URL`
- 检查 Nginx 是否正确代理 `/uploads`

### 数据丢失

- 如果使用 SQLite，确认 `database.sqlite` 没有随发版覆盖
- 生产环境建议使用 MySQL，并建立定期备份

