# 🗄️ MySQL 安装指南

## 📋 支持的 Linux 发行版

本指南适用于：
- Ubuntu 18.04+ / Debian 10+
- CentOS 7+ / RHEL 7+
- 其他基于 apt 或 yum 的系统

---

## 🚀 方法一：Ubuntu/Debian 安装 MySQL

### 步骤 1: 更新系统包

```bash
sudo apt update
sudo apt upgrade -y
```

### 步骤 2: 安装 MySQL Server

```bash
sudo apt install -y mysql-server
```

### 步骤 3: 启动 MySQL 服务

```bash
sudo systemctl start mysql
sudo systemctl enable mysql  # 设置开机自启
```

### 步骤 4: 检查 MySQL 状态

```bash
sudo systemctl status mysql
```

应该看到 `active (running)` 状态。

### 步骤 5: 设置 root 密码

**情况A：如果运行 `mysql_secure_installation` 时提示 "Skipping password set"**

这是因为 MySQL 8.0+ 默认使用 `auth_socket` 插件认证。需要手动设置密码：

```bash
# 直接登录（无需密码）
sudo mysql
```

登录后执行：

```sql
-- 切换到 mysql 数据库
USE mysql;

-- 修改 root 用户认证方式和密码
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourStrongPassword123!';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

**情况B：正常设置密码**

运行安全配置脚本：

```bash
sudo mysql_secure_installation
```

按照提示操作：

1. **设置密码验证策略**
   ```
   Would you like to setup VALIDATE PASSWORD plugin?
   ```
   - 选择 `Y`（推荐）或 `N`
   - 如果选择 Y，选择密码强度级别（0=低, 1=中, 2=高）

2. **设置 root 密码**
   ```
   Please set the password for root here.
   ```
   - 输入强密码（至少8位，包含大小写字母、数字、特殊字符）
   - 确认密码

3. **移除匿名用户**
   ```
   Remove anonymous users? (Press y|Y for Yes, any other key for No)
   ```
   - 选择 `Y`

4. **禁止 root 远程登录**
   ```
   Disallow root login remotely? (Press y|Y for Yes, any other key for No)
   ```
   - 选择 `Y`（推荐）

5. **移除测试数据库**
   ```
   Remove test database and access to it? (Press y|Y for Yes, any other key for No)
   ```
   - 选择 `Y`

6. **重新加载权限表**
   ```
   Reload privilege tables now? (Press y|Y for Yes, any other key for No)
   ```
   - 选择 `Y`

### 步骤 6: 登录 MySQL

```bash
# 如果设置了密码，使用 -p 参数
mysql -u root -p

# 如果还没设置密码，使用 sudo（不推荐）
sudo mysql
```

输入刚才设置的 root 密码。

---

## 🚀 方法二：CentOS/RHEL 安装 MySQL

### 步骤 1: 添加 MySQL Yum 仓库

```bash
# 下载 MySQL Yum 仓库
wget https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm

# 安装仓库
sudo rpm -ivh mysql80-community-release-el7-3.noarch.rpm
```

### 步骤 2: 安装 MySQL Server

```bash
sudo yum install -y mysql-server
```

### 步骤 3: 启动 MySQL 服务

```bash
sudo systemctl start mysqld
sudo systemctl enable mysqld  # 设置开机自启
```

### 步骤 4: 获取临时 root 密码

MySQL 8.0 首次启动会生成临时密码，查看日志：

```bash
sudo grep 'temporary password' /var/log/mysqld.log
```

输出类似：
```
2024-01-01T00:00:00.000000Z 1 [Note] A temporary password is generated for root@localhost: Abc123!@#
```

### 步骤 5: 登录并修改密码

```bash
mysql -u root -p
```

输入临时密码（从日志中获取）。

登录后立即修改密码：

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'YourNewStrongPassword123!';
FLUSH PRIVILEGES;
EXIT;
```

### 步骤 6: 安全配置

```bash
mysql_secure_installation
```

按照提示完成配置（同 Ubuntu 方法）。

---

## 🔧 配置 MySQL 用于项目

### 步骤 1: 登录 MySQL

```bash
mysql -u root -p
```

### 步骤 2: 创建数据库

```sql
CREATE DATABASE wx_we_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 步骤 3: 创建专用用户（推荐）

```sql
-- 创建用户
CREATE USER 'wx_love_user'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- 授予权限
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 步骤 4: 验证配置

```sql
-- 查看数据库
SHOW DATABASES;

-- 查看用户权限
SHOW GRANTS FOR 'wx_love_user'@'localhost';

-- 退出
EXIT;
```

### 步骤 5: 测试连接

```bash
mysql -u wx_love_user -p wx_we_love
```

输入密码，如果成功登录说明配置正确。

---

## ⚙️ 配置 MySQL 远程访问

⚠️ **注意**：如果只需要本地访问，可以跳过此步骤。

### 步骤 1: 修改 MySQL 配置，允许远程连接

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf  # Ubuntu/Debian
# 或
sudo nano /etc/my.cnf  # CentOS
```

找到 `bind-address` 行（通常在 `[mysqld]` 部分）：

```ini
bind-address = 127.0.0.1
```

修改为：

```ini
bind-address = 0.0.0.0
```

**说明：**
- `127.0.0.1` = 只允许本机连接
- `0.0.0.0` = 允许所有IP连接

保存并退出（Ctrl+X, Y, Enter）。

### 步骤 2: 登录 MySQL 并创建远程用户

```bash
# 如果设置了root密码
mysql -u root -p

# 如果还没设置密码
sudo mysql
```

登录后执行：

```sql
-- 方式1：允许从任何IP连接（简单但不安全）
CREATE USER 'wx_love_user'@'%' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'%';

-- 方式2：只允许特定IP连接（推荐，更安全）
-- 替换 '192.168.1.100' 为你的应用服务器IP
CREATE USER 'wx_love_user'@'192.168.1.100' IDENTIFIED BY 'your_strong_password_here';
GRANT ALL PRIVILEGES ON wx_we_love.* TO 'wx_love_user'@'192.168.1.100';

-- 刷新权限
FLUSH PRIVILEGES;

-- 查看用户
SELECT user, host FROM mysql.user WHERE user = 'wx_love_user';

-- 退出
EXIT;
```

**安全建议：**
- 优先使用方式2（限制IP），只允许特定服务器连接
- 如果必须使用方式1（`@'%'`），确保使用强密码
- 不要给远程用户授予 `ALL PRIVILEGES`，只授予必要的权限

### 步骤 3: 重启 MySQL 服务

```bash
sudo systemctl restart mysql  # Ubuntu/Debian
# 或
sudo systemctl restart mysqld  # CentOS

# 检查状态
sudo systemctl status mysql
```

### 步骤 4: 配置防火墙，开放 3306 端口

```bash
# Ubuntu (ufw)
sudo ufw allow 3306/tcp
sudo ufw status  # 查看规则

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=3306/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports  # 查看开放的端口

# 或使用 iptables
sudo iptables -A INPUT -p tcp --dport 3306 -j ACCEPT
sudo iptables-save
```

### 步骤 5: 测试远程连接

在另一台机器上测试连接：

```bash
# 安装 MySQL 客户端（如果还没有）
sudo apt install -y mysql-client  # Ubuntu/Debian
# 或
sudo yum install -y mysql  # CentOS

# 测试连接
mysql -h your_mysql_server_ip -u wx_love_user -p wx_we_love
```

如果连接成功，说明远程访问配置完成！

### 步骤 6: 更新项目配置

如果应用在另一台服务器上，更新 `.env` 文件：

```env
DB_HOST=your_mysql_server_ip  # 改为MySQL服务器的IP地址
DB_PORT=3306
DB_NAME=wx_we_love
DB_USER=wx_love_user
DB_PASSWORD=your_strong_password_here
```

---

## 🔍 常用 MySQL 命令

### 服务管理

```bash
# 启动
sudo systemctl start mysql    # Ubuntu/Debian
sudo systemctl start mysqld   # CentOS

# 停止
sudo systemctl stop mysql
sudo systemctl stop mysqld

# 重启
sudo systemctl restart mysql
sudo systemctl restart mysqld

# 查看状态
sudo systemctl status mysql
sudo systemctl status mysqld
```

### 数据库操作

```bash
# 登录
mysql -u root -p
mysql -u wx_love_user -p wx_we_love

# 查看所有数据库
SHOW DATABASES;

# 使用数据库
USE wx_we_love;

# 查看所有表
SHOW TABLES;

# 查看表结构
DESCRIBE table_name;

# 退出
EXIT;
```

---

## 🐛 常见问题解决

### 问题 1: 忘记 root 密码

**Ubuntu/Debian:**

```bash
# 停止 MySQL
sudo systemctl stop mysql

# 以安全模式启动
sudo mysqld_safe --skip-grant-tables &

# 登录（无需密码）
mysql -u root

# 修改密码
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPassword123!';
FLUSH PRIVILEGES;
EXIT;

# 重启 MySQL
sudo systemctl restart mysql
```

**CentOS:**

```bash
# 停止 MySQL
sudo systemctl stop mysqld

# 编辑配置文件
sudo nano /etc/my.cnf

# 在 [mysqld] 部分添加：
skip-grant-tables

# 保存并启动
sudo systemctl start mysqld

# 登录并修改密码（同上）
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPassword123!';
FLUSH PRIVILEGES;
EXIT;

# 移除 skip-grant-tables，重启
sudo systemctl restart mysqld
```

### 问题 2: 无法连接到 MySQL

**检查：**
1. MySQL 服务是否运行：`sudo systemctl status mysql`
2. 端口是否开放：`netstat -tulpn | grep 3306`
3. 防火墙是否阻止：检查防火墙规则
4. 用户权限是否正确：检查用户和权限

### 问题 3: 字符编码问题

确保数据库使用 utf8mb4：

```sql
-- 查看数据库字符集
SHOW CREATE DATABASE wx_we_love;

-- 如果不对，重新创建
DROP DATABASE wx_we_love;
CREATE DATABASE wx_we_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 📊 性能优化（可选）

### 调整 MySQL 配置

编辑配置文件：

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf  # Ubuntu/Debian
# 或
sudo nano /etc/my.cnf  # CentOS
```

添加或修改以下配置（根据服务器内存调整）：

```ini
[mysqld]
# 最大连接数
max_connections = 200

# 缓冲区大小（根据内存调整，1GB内存示例）
innodb_buffer_pool_size = 256M
key_buffer_size = 32M
max_allowed_packet = 64M

# 日志
slow_query_log = 1
long_query_time = 2
```

重启 MySQL：

```bash
sudo systemctl restart mysql
```

---

## ✅ 验证安装

运行以下命令验证 MySQL 安装成功：

```bash
# 检查版本
mysql --version

# 检查服务状态
sudo systemctl status mysql

# 测试连接
mysql -u root -p -e "SELECT VERSION();"

# 测试项目数据库
mysql -u wx_love_user -p wx_we_love -e "SHOW TABLES;"
```

如果所有命令都成功执行，说明 MySQL 安装配置完成！🎉

---

## 🔒 安全建议

1. ✅ 使用强密码（至少12位，包含大小写、数字、特殊字符）
2. ✅ 不要使用 root 用户运行应用，创建专用用户
3. ✅ 只授予必要的权限
4. ✅ 定期更新 MySQL
5. ✅ 配置防火墙，限制访问
6. ✅ 定期备份数据库
7. ✅ 启用慢查询日志，监控性能

---

## 📝 下一步

MySQL 安装完成后，继续：

1. 配置项目的 `.env` 文件
2. 测试数据库连接
3. 运行项目，自动创建表结构
4. 开始使用！

参考：`服务器部署指南.md`
