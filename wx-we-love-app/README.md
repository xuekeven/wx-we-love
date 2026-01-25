# 💕 情侣恋爱空间小程序

一个专为情侣设计的微信小程序，记录你们的美好时光。

## 功能特性

### 主页
- 💗 情侣专属顶栏
- 📅 实时日期显示
- 💑 恋爱天数统计
- 🎯 6大核心功能模块

### 核心功能
1. **💝 心愿清单** - 记录想一起做的事
2. **🌹 约会记录** - 保存甜蜜回忆
3. **🎂 纪念日** - 铭记重要时刻
4. **📝 记事本** - 记录生活点滴
5. **🐷 存钱罐** - 为梦想储蓄
6. **🌸 经期记录** - 关爱女性健康

### 个人中心
- 👤 情侣资料管理
- ⚙️ 个性化设置
- 🔔 消息提醒

## 技术栈

- **框架**: Taro 3.6
- **语言**: TypeScript + React
- **样式**: Sass
- **构建**: Webpack 5

## 开发指南

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev:weapp
```

### 生产构建
```bash
npm run build:weapp
```

## 项目结构

```
wx-we-love-app/
├── src/
│   ├── pages/          # 页面
│   │   ├── index/      # 主页
│   │   ├── wishlist/   # 心愿清单
│   │   ├── date-record/# 约会记录
│   │   ├── anniversary/# 纪念日
│   │   ├── notebook/   # 记事本
│   │   ├── piggy-bank/ # 存钱罐
│   │   ├── menstrual/  # 经期记录
│   │   ├── moment/     # Moment(开发中)
│   │   └── my/         # 我的
│   ├── utils/          # 工具函数
│   ├── app.tsx         # 应用入口
│   └── app.scss        # 全局样式
├── config/             # 配置文件
└── package.json
```

## 设计特色

- 🎨 现代渐变色设计
- 💖 粉色系温馨主题
- ✨ 流畅的动画效果
- 📱 响应式布局
- 🌈 精美的视觉交互

## 后端API

后端API地址: `http://39.102.122.22:3000`

详见后端项目 `wx-we-love-api`

## 开发者

Made with ❤️ by Cursor AI

## License

MIT

