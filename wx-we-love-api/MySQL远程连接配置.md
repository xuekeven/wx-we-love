# 🔌 MySQL 远程连接配置指南

## 📋 当前情况

- ✅ MySQL 已安装
- ⚠️ root 用户使用 `auth_socket` 认证（未设置密码）
- 🎯 需要配置远程连接

---

## 🔧 第一步：设置 root 密码

### 1.1 登录 MySQL（无需密码）

```bash
sudo mysql
```

### 1.2 设置 root 密码

```sql
-- 切换到 mysql 数据库
USE mysql;

-- 修改 root 用户认证方式并设置密码
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourStrongPassword123!';

-- 刷新权限
FLUSH PRIVILEGES;

-- 验证
SELECT user, host, plugin FROM mysql.user WHERE user = 'root';

-- 退出
EXIT;
```

### 1.3 测试新密码

```bash
mysql -u root -p
```

输入刚才设置的密码，应该能成功登录。

---

## 🌐 第二步：配置远程访问

### 2.1 修改 MySQL 配置文件

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf  # Ubuntu/Debian
# 或
sudo nano /etc/my.cnf  # CentOS
```

找到并修改：

```ini
[mysqld]
# 将这行：
bind-address = 127.0.0.1

# 改为：
bind-address = 0.0.0.0
```

**说明：**
- `127.0.0.1` = 只允许本机连接
- `0.0.0.0` = 允许所有IP连接

保存并退出（Ctrl+X, Y, Enter）。

### 2.2 创建远程访问用户

```bash
mysql -u root -p
```

输入 root 密码后执行：

#### 选项A：允许从任何IP连接（简单但不推荐）

```sql
-- 创建用户（允许任何IP）
CREATE USER 'wx_love_user'@'%' IDENTIFIED BY 'your_strong_password_here';

-- 授予权限
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

#### 选项B：只允许特定IP连接（推荐，更安全）

```sql
-- 创建用户（只允许特定IP，替换为你的应用服务器IP）
CREATE USER 'wx_love_user'@'192.168.1.100' IDENTIFIED BY 'your_strong_password_here';

-- 授予权限
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'192.168.1.100';

-- 刷新权限
FLUSH PRIVILEGES;

-- 查看用户
SELECT user, host FROM mysql.user WHERE user = 'wx_love_user';

-- 退出
EXIT;
```

**如果应用服务器IP会变化，可以创建多个用户：**

```sql
-- 允许多个IP
CREATE USER 'wx_love_user'@'192.168.1.100' IDENTIFIED BY 'your_strong_password';
CREATE USER 'wx_love_user'@'192.168.1.101' IDENTIFIED BY 'your_strong_password';

GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'192.168.1.100';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'192.168.1.101';

FLUSH PRIVILEGES;
```

### 2.3 重启 MySQL

```bash
sudo systemctl restart mysql  # Ubuntu/Debian
# 或
sudo systemctl restart mysqld  # CentOS

# 检查状态
sudo systemctl status mysql
```

---

## 🔥 第三步：配置防火墙

### 3.1 Ubuntu/Debian (ufw)

```bash
# 开放 3306 端口
sudo ufw allow 3306/tcp

# 查看规则
sudo ufw status

# 如果防火墙未启用，先启用
sudo ufw enable
```

### 3.2 CentOS/RHEL (firewalld)

```bash
# 开放 3306 端口
sudo firewall-cmd --permanent --add-port=3306/tcp

# 重新加载
sudo firewall-cmd --reload

# 查看开放的端口
sudo firewall-cmd --list-ports
```

### 3.3 使用 iptables（如果未使用 ufw/firewalld）

```bash
# 开放 3306 端口
sudo iptables -A INPUT -p tcp --dport 3306 -j ACCEPT

# 保存规则
sudo iptables-save

# 或使用 netfilter-persistent
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

---

## ✅ 第四步：测试远程连接

### 4.1 在应用服务器上测试

```bash
# 安装 MySQL 客户端（如果还没有）
sudo apt install -y mysql-client  # Ubuntu/Debian
# 或
sudo yum install -y mysql  # CentOS

# 测试连接（替换为你的MySQL服务器IP）
mysql -h your_mysql_server_ip -u wx_love_user -p wx_we_love
```

输入密码，如果成功连接，说明配置完成！

### 4.2 如果连接失败，检查以下内容

```bash
# 1. 检查 MySQL 是否监听所有接口
sudo netstat -tulpn | grep 3306
# 应该看到 0.0.0.0:3306，而不是 127.0.0.1:3306

# 2. 检查防火墙
sudo ufw status  # Ubuntu
sudo firewall-cmd --list-ports  # CentOS

# 3. 检查 MySQL 用户权限
mysql -u root -p
SELECT user, host FROM mysql.user WHERE user = 'wx_love_user';
```

---

## 📝 第五步：更新项目配置

### 5.1 如果应用在另一台服务器上

编辑 `.env` 文件：

```env
# MySQL 服务器IP地址（不是 localhost）
DB_HOST=192.168.1.50  # 替换为你的MySQL服务器IP
DB_PORT=3306
DB_NAME=wx_we_love
DB_USER=wx_love_user
DB_PASSWORD=your_strong_password_here
```

### 5.2 测试数据库连接

在应用服务器上：

```bash
cd /var/www/wx-we-love-api

# 测试连接
node -e "require('./src/config/database').authenticate().then(() => console.log('✅ 连接成功')).catch(e => console.error('❌ 连接失败:', e))"
```

---

## 🔒 安全建议

### 1. 使用强密码

```sql
-- 密码应该包含：
-- - 至少12位
-- - 大小写字母
-- - 数字
-- - 特殊字符
-- 例如：MySecurePass123!@#
```

### 2. 限制访问IP（推荐）

```sql
-- 只允许特定IP，不要使用 '%'
CREATE USER 'wx_love_user'@'192.168.1.100' IDENTIFIED BY 'strong_password';
```

### 3. 最小权限原则

```sql
-- 只授予必要的权限，不要使用 ALL PRIVILEGES
-- 如果只需要读写，可以这样：
GRANT SELECT, INSERT, UPDATE, DELETE ON wx_we_love.* TO 'wx_love_user'@'192.168.1.100';
```

### 4. 使用 SSL 连接（可选，更安全）

```sql
-- 要求使用SSL连接
ALTER USER 'wx_love_user'@'%' REQUIRE SSL;
```

### 5. 定期检查用户

```sql
-- 查看所有用户
SELECT user, host FROM mysql.user;

-- 查看用户权限
SHOW GRANTS FOR 'wx_love_user'@'%';
```

---

## 🐛 常见问题

### 问题1: 连接被拒绝 (Connection refused)

**原因：**
- MySQL 未监听 0.0.0.0
- 防火墙阻止连接

**解决：**
```bash
# 检查 bind-address
sudo grep bind-address /etc/mysql/mysql.conf.d/mysqld.cnf

# 检查防火墙
sudo ufw status
```

### 问题2: 访问被拒绝 (Access denied)

**原因：**
- 用户名或密码错误
- 用户没有从该IP连接的权限

**解决：**
```sql
-- 检查用户
SELECT user, host FROM mysql.user WHERE user = 'wx_love_user';

-- 如果用户不存在或IP不对，重新创建
DROP USER 'wx_love_user'@'%';
CREATE USER 'wx_love_user'@'your_ip' IDENTIFIED BY 'password';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'your_ip';
FLUSH PRIVILEGES;
```

### 问题3: 无法找到配置文件

**查找配置文件：**

```bash
# Ubuntu/Debian
sudo find /etc -name "my.cnf"
sudo find /etc -name "mysqld.cnf"

# CentOS
sudo find /etc -name "my.cnf"
```

---

## ✅ 配置检查清单

- [ ] root 密码已设置
- [ ] `bind-address` 已改为 `0.0.0.0`
- [ ] 远程用户已创建
- [ ] 用户权限已授予
- [ ] MySQL 已重启
- [ ] 防火墙已开放 3306 端口
- [ ] 远程连接测试成功
- [ ] 项目 `.env` 配置已更新

---

## 🎉 完成！

配置完成后，你的应用就可以从远程服务器连接到 MySQL 了！

**记住：**
- ✅ 使用强密码
- ✅ 限制访问IP（如果可能）
- ✅ 定期备份数据库
- ✅ 监控连接日志
