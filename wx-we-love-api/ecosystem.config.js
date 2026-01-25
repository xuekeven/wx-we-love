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
    // ⚠️ 警告: watch: true 会导致日志文件变化触发重启循环，生产环境必须设为 false
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
    max_restarts: 10,
    
    // kill_timeout: 优雅关闭超时时间（毫秒）
    // 类型: Number
    // 说明: 发送 SIGINT 信号后，等待应用自行关闭的时间
    // 如果超过此时间应用仍未关闭，PM2 会强制杀死进程（SIGKILL）
    // 示例:
    //   - 5000: 5秒
    //   - 10000: 10秒
    // 默认: 1600
    // 注意: 给应用足够时间完成清理工作（关闭数据库连接、保存数据等）
    kill_timeout: 5000,
    
    // wait_ready: 是否等待应用就绪信号
    // 类型: Boolean
    // 值:
    //   - true: 等待应用发送 'ready' 信号后才认为启动成功
    //   - false: 应用启动后立即认为成功
    // 默认: false
    // 说明: 应用需要调用 process.send('ready') 发送就绪信号
    // 适用场景: 需要等待数据库连接、外部服务等初始化完成
    wait_ready: false,
    
    // listen_timeout: 监听超时时间（毫秒）
    // 类型: Number
    // 说明: 等待应用发送 'ready' 信号的最大时间
    // 如果超过此时间仍未收到信号，PM2 会认为启动失败
    // 默认: 10000 (10秒)
    // 注意: 需要 wait_ready: true 时才生效
    listen_timeout: 10000,
    
    // shutdown_with_message: 关闭时发送消息
    // 类型: Boolean
    // 值:
    //   - true: 关闭前发送 shutdown 消息给应用
    //   - false: 直接关闭
    // 默认: false
    // 说明: 应用可以通过 process.on('message', (msg) => {...}) 接收消息
    shutdown_with_message: false,
    
    // time: 是否在日志中添加时间戳
    // 类型: Boolean
    // 值:
    //   - true: 每条日志前自动添加时间戳
    //   - false: 不添加（使用 log_date_format 格式）
    // 默认: false
    // 注意: 如果 log_date_format 已设置，通常不需要启用此选项
    time: false,
    
    // ignore_watch: 忽略监听的文件/目录（watch: true 时生效）
    // 类型: Array | String
    // 说明: 即使 watch: true，这些文件/目录的变化也不会触发重启
    // 示例:
    //   - ['node_modules', '.git', 'logs']: 忽略多个目录
    //   - '*.log': 忽略所有日志文件
    //   - ['**/*.log', '**/node_modules/**']: 使用 glob 模式
    // 默认: ['node_modules', '.git']
    ignore_watch: [
      'node_modules',
      '.git',
      'logs',
      '*.log',
      '*.sqlite',
      '*.db'
    ],
    
    // source_map_support: 是否支持 Source Map
    // 类型: Boolean
    // 值:
    //   - true: 支持 Source Map，错误堆栈显示原始代码位置
    //   - false: 不支持
    // 默认: true
    // 说明: 对于 TypeScript、Babel 转译的代码很有用
    source_map_support: true,
    
    // instance_var: 实例变量名
    // 类型: String
    // 说明: 环境变量名，用于标识当前实例编号
    // 默认: 'INSTANCE_ID' 或 'NODE_APP_INSTANCE'
    // 示例: 在代码中可以通过 process.env[instance_var] 获取实例编号
    // 适用场景: cluster 模式下区分不同实例
    instance_var: 'INSTANCE_ID',
    
    // pmx: PMX 监控配置
    // 类型: Boolean | Object
    // 值:
    //   - true: 启用 PMX 监控（默认）
    //   - false: 禁用监控
    //   - { http: true }: 启用 HTTP 监控
    // 说明: PMX 提供应用性能监控、自定义指标等功能
    pmx: true,
    
    // cron_restart: 定时重启（Cron 表达式）
    // 类型: String
    // 格式: Cron 表达式（分 时 日 月 周）
    // 示例:
    //   - '0 3 * * *': 每天凌晨3点重启
    //   - '0 0 * * 0': 每周日凌晨重启
    //   - '0 */6 * * *': 每6小时重启一次
    //   - '0 0 1 * *': 每月1号凌晨重启
    // 说明: 用于定期重启应用，释放内存、应用更新等
    // 默认: 不设置（不自动重启）
    // cron_restart: '0 3 * * *',  // 示例：每天凌晨3点重启（已注释）
    
    // restart_delay: 重启延迟时间（毫秒）
    // 类型: Number
    // 说明: 应用崩溃后，等待多长时间再重启
    // 示例:
    //   - 4000: 等待4秒后重启
    //   - 0: 立即重启
    // 默认: 0
    // 适用场景: 避免频繁重启，给系统时间恢复
    restart_delay: 0,
    
    // exp_backoff_restart_delay: 指数退避重启延迟
    // 类型: Number
    // 说明: 如果应用频繁崩溃，重启延迟会指数增长
    // 第一次延迟: restart_delay
    // 第二次延迟: restart_delay * exp_backoff_restart_delay
    // 第三次延迟: restart_delay * exp_backoff_restart_delay^2
    // 默认: 100
    // 示例: restart_delay: 1000, exp_backoff_restart_delay: 2
    //   第一次: 1秒，第二次: 2秒，第三次: 4秒，第四次: 8秒...
    exp_backoff_restart_delay: 100,
    
    // node_args: Node.js 启动参数
    // 类型: String | Array
    // 说明: 传递给 node 命令的参数
    // 示例:
    //   - '--max-old-space-size=2048': 设置最大内存为2GB
    //   - '--harmony': 启用 ES6 特性
    //   - ['--max-old-space-size=2048', '--harmony']: 多个参数
    // 默认: 无
    // node_args: '--max-old-space-size=2048',  // 示例（已注释）
    
    // interpreter: 解释器路径
    // 类型: String
    // 说明: 用于执行脚本的解释器
    // 示例:
    //   - 'node': Node.js（默认）
    //   - '/usr/bin/node': 指定 Node.js 路径
    //   - 'python': Python 解释器
    //   - 'bash': Bash 脚本
    // 默认: 'node'
    interpreter: 'node',
    
    // interpreter_args: 解释器参数
    // 类型: String | Array
    // 说明: 传递给解释器的参数
    // 示例:
    //   - '--harmony': Node.js 参数
    //   - '-u': Python 无缓冲输出
    // 默认: 无
    // interpreter_args: '--harmony',  // 示例（已注释）
    
    // cwd: 工作目录
    // 类型: String
    // 说明: 应用运行的工作目录
    // 默认: 配置文件所在目录
    // 示例: '/var/www/app', './dist'
    // cwd: '/var/www/wx-we-love-api',  // 示例（已注释，使用默认值）
    
    // pid_file: PID 文件路径
    // 类型: String
    // 说明: 存储进程 ID 的文件路径
    // 默认: ~/.pm2/pids/app-name.pid
    // 示例: '/var/run/app.pid'
    // pid_file: '/var/run/wx-we-love-api.pid',  // 示例（已注释）
    
    // combine_logs: 是否合并所有实例的日志（已废弃，使用 merge_logs）
    // 类型: Boolean
    // 说明: 此选项已废弃，请使用 merge_logs
    // combine_logs: true,  // 已废弃
    
    // vizion: 是否启用版本控制集成
    // 类型: Boolean
    // 值:
    //   - true: 启用 Git 版本信息追踪
    //   - false: 禁用
    // 默认: true
    // 说明: PM2 会追踪 Git 提交信息，便于查看部署版本
    vizion: true,
    
    // post_update: 更新后执行的命令
    // 类型: Array
    // 说明: 应用更新后（git pull 等）执行的命令
    // 示例:
    //   - ['npm install', 'pm2 restart app']: 安装依赖并重启
    //   - ['npm run build']: 构建项目
    // 默认: 无
    // post_update: ['npm install', 'npm run build'],  // 示例（已注释）
    
    // force: 是否强制启动
    // 类型: Boolean
    // 值:
    //   - true: 即使应用已存在也强制启动
    //   - false: 如果应用已存在则不启动
    // 默认: false
    // 说明: 用于覆盖已存在的同名应用
    force: false,
    
    // append_env_to_name: 是否在应用名后追加环境名
    // 类型: Boolean
    // 值:
    //   - true: 应用名变为 'app-name-production'
    //   - false: 保持原名称
    // 默认: false
    // 说明: 便于区分不同环境的实例
    append_env_to_name: false,
    
    // env_production: 生产环境变量（覆盖 env）
    // 类型: Object
    // 说明: 使用 pm2 start ecosystem.config.js --env production 时使用
    // 示例:
    //   env_production: {
    //     NODE_ENV: 'production',
    //     PORT: 4000
    //   }
    // env_production: {
    //   NODE_ENV: 'production',
    //   PORT: 4000
    // },
    
    // env_development: 开发环境变量（覆盖 env）
    // 类型: Object
    // 说明: 使用 pm2 start ecosystem.config.js --env development 时使用
    // env_development: {
    //   NODE_ENV: 'development',
    //   PORT: 3000
    // }
  }]
}
