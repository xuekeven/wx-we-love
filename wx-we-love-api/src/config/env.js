const MIN_JWT_SECRET_LENGTH = 32;

function configurationError(message) {
  const error = new Error(message);
  error.code = 'CONFIGURATION_ERROR';
  return error;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < MIN_JWT_SECRET_LENGTH) {
    throw configurationError(`JWT_SECRET must contain at least ${MIN_JWT_SECRET_LENGTH} characters`);
  }
  return secret;
}

function validateEnvironment() {
  getJwtSecret();

  if (process.env.NODE_ENV === 'production') {
    for (const name of ['WX_APPID', 'WX_SECRET', 'API_BASE_URL']) {
      if (!process.env[name]?.trim()) {
        throw configurationError(`${name} is required in production`);
      }
    }

    let apiBaseUrl;
    try {
      apiBaseUrl = new URL(process.env.API_BASE_URL.trim());
    } catch {
      throw configurationError('API_BASE_URL must be a valid absolute URL');
    }
    if (apiBaseUrl.protocol !== 'https:') {
      throw configurationError('API_BASE_URL must use HTTPS in production');
    }
  }
}

function getCorsOrigins() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

module.exports = {
  MIN_JWT_SECRET_LENGTH,
  getCorsOrigins,
  getJwtSecret,
  validateEnvironment
};
