// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true  // 启用 TypeScript，否则 Babel 会把 interface 等语法误识别为 Flow 报错
    }]
  ]
}

