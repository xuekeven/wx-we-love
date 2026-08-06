const https = require('https');

let accessTokenCache = null;

function requestJson(url, { method = 'GET', body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const request = https.request(url, {
      method,
      timeout: 8000,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      } : undefined
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode < 200 || response.statusCode >= 300 || parsed.errcode) {
            const error = new Error(parsed.errmsg || `WeChat API returned ${response.statusCode}`);
            error.code = parsed.errcode || 'WECHAT_API_ERROR';
            reject(error);
            return;
          }
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Invalid WeChat API response: ${error.message}`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('WeChat API timeout')));
    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

function wechatCredentials() {
  const appid = process.env.WX_APPID?.trim();
  const secret = process.env.WX_SECRET?.trim();
  if (!appid || !secret) throw new Error('未配置 WX_APPID 或 WX_SECRET');
  return { appid, secret };
}

async function getSessionByCode(code) {
  const { appid, secret } = wechatCredentials();
  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');
  const result = await requestJson(url);
  return { openId: result.openid };
}

async function getAccessToken() {
  if (accessTokenCache?.expiresAt > Date.now() + 60000) return accessTokenCache.value;
  const { appid, secret } = wechatCredentials();
  const url = new URL('https://api.weixin.qq.com/cgi-bin/token');
  url.searchParams.set('grant_type', 'client_credential');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  const result = await requestJson(url);
  accessTokenCache = {
    value: result.access_token,
    expiresAt: Date.now() + Number(result.expires_in || 7200) * 1000
  };
  return accessTokenCache.value;
}

async function getPhoneNumber(code) {
  const accessToken = await getAccessToken();
  const url = new URL('https://api.weixin.qq.com/wxa/business/getuserphonenumber');
  url.searchParams.set('access_token', accessToken);
  const result = await requestJson(url, { method: 'POST', body: { code } });
  return result.phone_info?.purePhoneNumber || result.phone_info?.phoneNumber || null;
}

module.exports = { getPhoneNumber, getSessionByCode };
