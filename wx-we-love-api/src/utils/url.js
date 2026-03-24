/**
 * 将历史遗留的旧服务器 URL 统一替换为当前域名。
 * 例如：http://39.102.122.22:4000/uploads/xxx → https://www.kaitool.top/welove/uploads/xxx
 *
 * 只处理 /uploads/ 路径下的本地上传资源；外部链接（微信 CDN 等）原样返回。
 */

const CURRENT_BASE_URL = process.env.API_BASE_URL || 'https://www.kaitool.top/welove';

// 需要被替换的旧前缀（可以扩展更多历史地址）
const OLD_PREFIXES = [
  'http://39.102.122.22:4000',
  'http://39.102.122.22:3000',
  'http://39.102.122.22',
];

/**
 * 规范化单个头像/图片 URL
 * @param {string|null|undefined} url
 * @returns {string}
 */
function normalizeUrl(url) {
  if (!url || typeof url !== 'string') return url || '';
  for (const prefix of OLD_PREFIXES) {
    if (url.startsWith(prefix)) {
      return CURRENT_BASE_URL.replace(/\/$/, '') + url.slice(prefix.length);
    }
  }
  return url;
}

module.exports = { normalizeUrl, CURRENT_BASE_URL };
