module.exports = {
  // apps: 应用配置数组，可以配置多个应用
  apps: [{
    // name: 应用名称，用于 PM2 管理（pm2 start/stop/restart name）
    // 类型: String
    // 示例: 'wx-we-love-api', 'my-app', 'api-server'
    name: 'wx-we-love-api',
    
    // script: 要执行的脚本文件路径（相对于配置文件位置）
    // 类型: String
    // 示例: './src/index.js', './server.js', 'node app.js'
    script: './src/index.js',
    
    // instances: 应用实例数量
    // 类型: Number | String
    // 值:
    //   - 数字: 指定实例数量，如 1, 2, 4
    //   - 'max': 使用所有 CPU 核心数（需要 exec_mode: 'cluster'）
    // 注意: 如果 exec_mode 是 'fork'，instances 只能为 1
    instances: 1,
    
    // exec_mode: 执行模式
    // 类型: String
    // 值:
    //   - 'fork': 单进程模式（默认），适合非 Node.js 应用或需要单实例的应用
    //   - 'cluster': 集群模式，利用多核 CPU，适合 Node.js 应用
    // 注意: cluster 模式需要 instances > 1 或 instances: 'max'
    exec_mode: 'fork',
    
    // env: 环境变量对象，传递给应用进程
    // 类型: Object
    // 说明: 这些变量可以通过 process.env 在应用中访问
    // 可以定义多个环境: env, env_production, env_development
    env: {
      // NODE_ENV: Node.js 环境标识
      // 值: 'development' | 'production' | 'test'
      NODE_ENV: 'production',
      
      // PORT: 应用监听端口
      // 类型: Number | String
      PORT: 4000
    },
    
    // error_file: 错误日志文件路径（stderr 输出）
    // 类型: String
    // 说明: 记录应用运行时的错误信息
    // 路径: 相对于应用启动目录，或使用绝对路径
    // 示例: './logs/err.log', '/var/log/app/error.log'
    error_file: './logs/err.log',
    
    // out_file: 标准输出日志文件路径（stdout 输出）
    // 类型: String
    // 说明: 记录应用的正常输出信息（console.log 等）
    // 路径: 相对于应用启动目录，或使用绝对路径
    // 示例: './logs/out.log', '/var/log/app/output.log'
    out_file: './logs/out.log',
    
    // log_date_format: 日志时间格式
    // 类型: String
    // 格式: 使用 moment.js 日期格式
    // 示例:
    //   - 'YYYY-MM-DD HH:mm:ss Z': 2024-01-01 12:00:00 +08:00
    //   - 'YYYY-MM-DD HH:mm:ss': 2024-01-01 12:00:00
    //   - 'MM-DD HH:mm': 01-01 12:00
    // 说明: Z 表示时区偏移
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // merge_logs: 是否合并日志
    // 类型: Boolean
    // 值:
    //   - true: 所有实例的日志合并到一个文件（cluster 模式时有用）
    //   - false: 每个实例的日志分开保存
    // 默认: false
    merge_logs: true,
    
    // autorestart: 是否自动重启
    // 类型: Boolean
    // 值:
    //   - true: 应用崩溃时自动重启
    //   - false: 应用崩溃时不重启
    // 默认: true
    autorestart: true,
    
    // watch: 是否监听文件变化
    // 类型: Boolean | Array
    // 值:
    //   - false: 不监听文件变化（生产环境推荐）
    //   - true: 监听所有文件变化，变化时自动重启
    //   - ['src', 'config']: 只监听指定目录/文件
    // 注意: 生产环境建议设为 false，避免不必要的重启
    watch: false,
    
    // max_memory_restart: 内存限制，超过此值自动重启
    // 类型: String
    // 格式: 数字 + 单位（K, M, G）
    // 示例:
    //   - '500M': 500MB
    //   - '1G': 1GB
    //   - '256M': 256MB
    // 说明: 防止内存泄漏导致服务器崩溃
    // 默认: 无限制
    max_memory_restart: '500M',
    
    // min_uptime: 最小运行时间，低于此时间不视为正常启动
    // 类型: String
    // 格式: 数字 + 单位（ms, s, m, h）
    // 示例:
    //   - '10s': 10秒
    //   - '1m': 1分钟
    //   - '5000ms': 5000毫秒
    // 说明: 如果应用启动后在此时间内崩溃，PM2 会认为启动失败
    // 默认: '1s'
    min_uptime: '10s',
    
    // max_restarts: 最大重启次数（在 min_uptime 时间内）
    // 类型: Number
    // 说明: 如果应用在 min_uptime 时间内重启超过此次数，PM2 会停止重启
    // 示例:
    //   - 10: 最多重启10次
    //   - 0: 无限制
    // 默认: 16
    // 注意: 配合 min_uptime 使用，防止无限重启循环
    max_restarts: 10
  }]
}
