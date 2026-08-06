const { Sequelize } = require('sequelize');

// 使用内存数据库进行开发（如果没有配置MySQL）
const sequelize = process.env.DB_HOST 
  ? new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    )
  : new Sequelize({
      dialect: 'sqlite',
      // 使用文件存储（数据持久化），如果想用内存模式改为 ':memory:'
      storage: process.env.SQLITE_STORAGE || './database.sqlite',
      logging: false
    });

module.exports = sequelize;
