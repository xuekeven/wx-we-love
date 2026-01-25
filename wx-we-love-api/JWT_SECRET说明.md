# 🔐 JWT_SECRET 说明

## 📖 什么是 JWT_SECRET？

**JWT_SECRET** 是一个密钥（Secret Key），用于：
1. **签名 JWT Token**：生成用户登录凭证时使用
2. **验证 JWT Token**：验证用户身份时使用

## 🔑 JWT 工作原理

### 1. 用户登录时

```
用户登录成功
  ↓
后端生成 JWT Token（使用 JWT_SECRET 签名）
  ↓
返回 Token 给前端
```

### 2. 用户访问接口时

```
前端发送请求（携带 Token）
  ↓
后端验证 Token（使用 JWT_SECRET 验证签名）
  ↓
验证通过 → 允许访问
验证失败 → 拒绝访问
```

## ⚠️ 为什么需要 JWT_SECRET？

### 安全性

JWT_SECRET 确保：
- ✅ **防止伪造**：没有密钥无法生成有效的 Token
- ✅ **防止篡改**：Token 被修改后验证会失败
- ✅ **身份验证**：只有知道密钥的服务器才能验证 Token

### 类比理解

JWT_SECRET 就像：
- 🔒 **保险箱的密码**：只有知道密码才能打开
- 🎫 **印章**：只有官方印章才能证明票据有效
- 🔑 **钥匙**：只有正确的钥匙才能开门

## 🎯 在你的项目中的使用

### 代码位置

**生成 Token（登录时）：**
```javascript
// src/routes/user.js
const token = jwt.sign(
  { userId: user.id, openId: user.openId },
  process.env.JWT_SECRET || 'your_secret_key',  // 使用 JWT_SECRET
  { expiresIn: '30d' }
);
```

**验证 Token（访问接口时）：**
```javascript
// src/middleware/auth.js 或 src/routes/user.js
const decoded = jwt.verify(
  token,
  process.env.JWT_SECRET || 'your_secret_key'  // 使用 JWT_SECRET 验证
);
```

## 🔧 如何生成安全的 JWT_SECRET？

### 方法一：使用 Node.js 生成（推荐）

```bash
# 在服务器上运行
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

输出示例：
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 方法二：使用 OpenSSL

```bash
openssl rand -hex 32
```

### 方法三：在线生成器

访问：https://www.grc.com/passwords.htm
- 选择 "64 Random Hexadecimal Characters"
- 复制生成的字符串

### 方法四：使用密码管理器

使用 1Password、LastPass 等工具生成随机字符串。

## 📝 配置 JWT_SECRET

### 1. 在 `.env` 文件中配置

```env
# 使用生成的强密钥（至少32位）
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### 2. 安全要求

✅ **必须：**
- 至少 32 个字符（推荐 64 个字符）
- 使用随机字符串（不要使用有意义的单词）
- 包含字母和数字（可以包含特殊字符）
- 每个环境使用不同的密钥（开发/生产）

❌ **不要：**
- 使用默认值 `'your_secret_key'`
- 使用简单密码如 `'123456'`、`'password'`
- 使用有意义的单词如 `'my_secret_key'`
- 在代码中硬编码（必须使用环境变量）

## 🔒 安全最佳实践

### 1. 不同环境使用不同密钥

```env
# 开发环境
JWT_SECRET=dev_secret_key_here_32_chars_min

# 生产环境
JWT_SECRET=prod_secret_key_here_64_chars_recommended
```

### 2. 定期轮换（可选）

如果怀疑密钥泄露，可以：
1. 生成新密钥
2. 更新 `.env` 文件
3. 重启服务
4. 所有用户需要重新登录（因为旧 Token 失效）

### 3. 保护密钥

- ✅ 存储在 `.env` 文件中
- ✅ `.env` 文件权限设置为 600（只有所有者可读写）
- ✅ 不要提交到 Git（已在 `.gitignore` 中）
- ✅ 不要在前端代码中使用
- ✅ 不要在日志中输出

## 🐛 常见问题

### 问题1: 使用默认密钥会怎样？

**风险：**
- 如果其他人知道默认密钥，可以伪造 Token
- 安全性极低

**解决：**
立即生成新密钥并更新配置。

### 问题2: 密钥太短会怎样？

**风险：**
- 容易被暴力破解
- 安全性降低

**解决：**
使用至少 32 个字符的随机字符串。

### 问题3: 忘记密钥怎么办？

**影响：**
- 无法验证现有 Token
- 所有用户需要重新登录

**解决：**
1. 生成新密钥
2. 更新 `.env` 文件
3. 重启服务
4. 用户重新登录

### 问题4: 密钥泄露了怎么办？

**立即行动：**
1. 生成新密钥
2. 更新 `.env` 文件
3. 重启服务
4. 检查是否有异常访问
5. 考虑通知用户更改密码

## 📊 密钥强度对比

| 密钥类型 | 长度 | 安全性 | 示例 |
|---------|------|--------|------|
| ❌ 默认值 | 14 | 极低 | `your_secret_key` |
| ❌ 简单密码 | 8 | 低 | `12345678` |
| ⚠️ 短随机 | 16 | 中 | `a1b2c3d4e5f6g7h8` |
| ✅ 推荐 | 32 | 高 | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6` |
| ✅ 最佳 | 64 | 很高 | `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2` |

## 🎯 快速配置步骤

### 1. 生成密钥

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. 复制生成的密钥

### 3. 更新 `.env` 文件

```env
JWT_SECRET=你生成的密钥
```

### 4. 重启服务

```bash
pm2 restart wx-we-love-api
```

## ✅ 检查清单

- [ ] JWT_SECRET 已生成（至少32位）
- [ ] 已更新 `.env` 文件
- [ ] `.env` 文件权限已设置（600）
- [ ] 已重启服务
- [ ] 登录功能正常
- [ ] Token 验证正常

## 📚 相关文件

- `src/routes/user.js` - 生成 Token
- `src/middleware/auth.js` - 验证 Token
- `.env.example` - 配置示例
- `.env` - 实际配置（不要提交到 Git）

---

**记住：JWT_SECRET 是保护你应用安全的重要密钥，一定要使用强密码！** 🔐
