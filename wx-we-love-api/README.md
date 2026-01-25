# 💕 情侣恋爱空间小程序 - 后端API

后端API服务，为情侣恋爱空间小程序提供数据支持。

## 技术栈

- **运行环境**: Node.js
- **框架**: Express.js
- **数据库**: MySQL / SQLite (开发)
- **认证**: JWT

## 功能模块

### 用户管理
- 用户信息获取与更新
- 情侣资料管理
- 功能排序设置

### 核心功能API
1. **心愿清单** `/api/wishlist`
   - 增删改查心愿
   - 更新完成状态

2. **约会记录** `/api/date-records`
   - 记录约会详情
   - 上传照片
   - 评分系统

3. **纪念日** `/api/anniversaries`
   - 管理重要日期
   - 提醒设置

4. **记事本** `/api/notes`
   - 笔记增删改查
   - 心情记录

5. **存钱罐** `/api/piggy-bank`
   - 收支记录
   - 余额统计

6. **经期记录** `/api/menstrual`
   - 经期记录管理
   - 周期预测

## 安装与运行

### 安装依赖
```bash
npm install
```

### 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件配置数据库等信息
```

### 开发模式
```bash
npm run dev
```

### 生产模式
```bash
npm start
```

## API端点

### 基础路由
- `GET /` - API信息
- `GET /health` - 健康检查

### 用户相关
- `GET /api/user/info` - 获取用户信息
- `POST /api/user/info` - 更新用户信息
- `POST /api/user/function-order` - 更新功能排序

### 心愿清单
- `GET /api/wishlist` - 获取心愿列表
- `POST /api/wishlist` - 添加心愿
- `POST /api/wishlist/:id/status` - 更新状态
- `DELETE /api/wishlist/:id` - 删除心愿

### 约会记录
- `GET /api/date-records` - 获取记录
- `POST /api/date-records` - 添加记录
- `DELETE /api/date-records/:id` - 删除记录

### 纪念日
- `GET /api/anniversaries` - 获取纪念日
- `POST /api/anniversaries` - 添加纪念日
- `DELETE /api/anniversaries/:id` - 删除纪念日

### 记事本
- `GET /api/notes` - 获取笔记
- `POST /api/notes` - 添加笔记
- `PUT /api/notes/:id` - 更新笔记
- `DELETE /api/notes/:id` - 删除笔记

### 存钱罐
- `GET /api/piggy-bank` - 获取记录
- `POST /api/piggy-bank` - 添加记录
- `DELETE /api/piggy-bank/:id` - 删除记录

### 经期记录
- `GET /api/menstrual` - 获取记录列表
- `GET /api/menstrual/:id` - 获取单条记录
- `POST /api/menstrual` - 添加记录
- `PUT /api/menstrual/:id` - 更新记录
- `DELETE /api/menstrual/:id` - 删除记录
- `GET /api/menstrual/stats/cycle` - 获取统计信息

## 响应格式

### 成功响应
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误信息"
}
```

## 数据存储

当前版本使用内存存储（开发阶段），数据在服务重启后会丢失。

生产环境建议：
- 配置MySQL数据库
- 使用Sequelize ORM
- 实现数据持久化

## 部署

### 服务器要求
- Node.js 14+
- PM2 (推荐)
- MySQL 5.7+ (可选)

### PM2部署
```bash
npm install -g pm2
pm2 start src/index.js --name wx-we-love-api
pm2 save
pm2 startup
```

### Nginx反向代理配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 开发计划

- [ ] 用户认证系统
- [ ] 数据库持久化
- [ ] 图片上传功能
- [ ] 消息推送
- [ ] 数据备份与恢复
- [ ] API文档（Swagger）
- [ ] 单元测试

## License

MIT

