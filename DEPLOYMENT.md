# wx-we-love 部署文档

项目由 `wx-we-love-api` 后端和 `wx-we-love-app` 微信小程序组成。生产 API 必须通过 HTTPS 提供，并在微信公众平台配置为合法 request 域名。

## 1. 环境要求

- Linux 服务器，建议 1C1G 起步
- Node.js 20.17+，推荐 Node.js 22 LTS
- 前后端均使用 pnpm 11.20+
- MySQL 5.7+/8.0；SQLite 仅建议低流量单实例使用
- Nginx 与进程管理器（示例使用 PM2）
- 已备案且证书有效的 HTTPS 域名
- 本地微信开发者工具与小程序 AppID

## 2. 部署后端

以下示例假设仓库位于 `/var/www/wx-we-love`，API 对外地址为 `https://api.example.com`。

### 2.1 安装依赖

```bash
cd /var/www/wx-we-love/wx-we-love-api
pnpm install --frozen-lockfile
```

生产发布应使用已提交的 `pnpm-lock.yaml` 和 `pnpm install --frozen-lockfile`，避免部署时解析到未经验证的新版本。

### 2.2 配置环境变量

```bash
cp .env.example .env
```

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

API_BASE_URL=https://api.example.com
CORS_ORIGINS=https://admin.example.com
UPLOAD_DIR=/var/lib/wx-we-love/uploads

```

- `JWT_SECRET` 至少 32 个字符，开发与生产使用不同值，不得提交到 Git。
- `API_BASE_URL` 是生成上传文件 URL 的外部 HTTPS 基址。
- `CORS_ORIGINS` 是允许的浏览器来源，多个值用逗号分隔；没有后台网页时可以留空。
- `UPLOAD_DIR` 应位于持久化目录，不随代码发布删除。

使用 SQLite 时不设置 `DB_HOST`，并改为持久化绝对路径：

```env
SQLITE_STORAGE=/var/lib/wx-we-love/database.sqlite
```

### 2.3 初始化 MySQL

```sql
CREATE DATABASE wx_we_love DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'wx_we_love'@'127.0.0.1' IDENTIFIED BY 'your_database_password';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_we_love'@'127.0.0.1';
FLUSH PRIVILEGES;
```

数据库账号只授予该数据库权限，不要让应用使用 MySQL root 账号。

### 2.4 备份并执行迁移

每次升级前先备份数据库和上传目录：

```bash
cd /var/www/wx-we-love/wx-we-love-api
pnpm backup
```

脚本默认从 `mysql-server` Docker 容器导出数据库，读取 `.env` 中的数据库名和 `UPLOAD_DIR`，并将经过完整性校验的备份写入 `~/backup`。容器名或备份目录不同时，通过 `MYSQL_CONTAINER`、`BACKUP_DIR` 环境变量覆盖。

服务启动时会连接数据库并执行 `SchemaMigrations` 中尚未应用的版本化迁移，迁移成功后才监听端口。首次启动或升级前可先在同结构的备份副本上验证。

### 2.5 启动与探针

```bash
mkdir -p /var/lib/wx-we-love/uploads
pnpm start
```

另开终端验证：

```bash
curl --fail http://127.0.0.1:4000/health/live
curl --fail http://127.0.0.1:4000/health/ready
```

- `/health/live` 只表示进程存活。
- `/health/ready` 仅在数据库初始化和迁移完成后返回 200，发布检查和负载均衡应使用它。

PM2 示例：

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## 3. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name api.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    client_max_body_size 6m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $request_id;
    }
}
```

```bash
nginx -t
systemctl reload nginx
curl --fail https://api.example.com/health/ready
```

应用上传限制为 5 MB，Nginx 预留少量 multipart 开销即可，无需开放到 20 MB。

## 4. 构建小程序

构建时通过环境变量注入 API 地址，不修改源码中的配置文件：

```bash
cd /var/www/wx-we-love/wx-we-love-app
pnpm install --frozen-lockfile
TARO_APP_API_BASE_URL=https://api.example.com pnpm typecheck
TARO_APP_API_BASE_URL=https://api.example.com pnpm build:weapp
```

生产构建会拒绝非 HTTPS 地址。产物位于 `wx-we-love-app/dist/`。

在微信开发者工具中：

1. 打开 `wx-we-love-app`。
2. 确认 `project.config.json` 使用正式 AppID。
3. 编译并验证登录、上传、匹配和数据访问。
4. 上传版本并在微信公众平台提交审核。

微信公众平台的 request 合法域名填写 `https://api.example.com`，不要填写 URL 路径。

## 5. 发布流程

后端滚动发布建议顺序：

1. 对数据库与上传目录做同一时间点备份。
2. 在单个实例安装依赖并启动新版本。
3. 等待 `/health/ready` 返回 200。
4. 再把流量切到新实例并逐个替换旧实例。
5. 观察结构化请求日志和错误率。

单实例 PM2 发布：

```bash
cd /var/www/wx-we-love
git pull --ff-only
cd wx-we-love-api
pnpm install --frozen-lockfile
pm2 restart wx-we-love-api --update-env
curl --fail https://api.example.com/health/ready
```

## 6. 备份与删除保留

- 数据库与 `UPLOAD_DIR` 必须一起备份，避免引用与文件不一致。
- 定期执行恢复演练；未验证可恢复的备份不算有效备份。
- 设置明确保留周期并加密、限制访问。
- 账号删除会立即清除在线数据库记录和用户上传目录；历史备份按既定周期到期删除，恢复时不得把已删除账号重新带回线上。

更多隐私约束见 [PRIVACY.md](./PRIVACY.md)，数据库命令见 [wx-we-love-api/docs/数据库命令.md](./wx-we-love-api/docs/数据库命令.md)。

## 7. 故障排查

### 就绪探针返回 503

- 检查 `DB_*` 或 `SQLITE_STORAGE`。
- 查看启动日志中的数据库认证或迁移错误。
- 不要绕过迁移直接把实例加入负载均衡。

### 小程序请求失败

- 确认构建时 `TARO_APP_API_BASE_URL` 为正确 HTTPS 地址。
- 确认微信公众平台已配置合法 request 域名。
- 确认证书链有效且 Nginx 能访问 `/health/ready`。
- 真机调试本地服务时使用电脑局域网 IP，不能使用 `localhost`。

### 图片无法访问

- 确认 `UPLOAD_DIR` 存在且运行用户有读写权限。
- 确认 `API_BASE_URL` 与外部访问地址一致。
- 确认发布流程没有覆盖或清空持久化上传目录。
