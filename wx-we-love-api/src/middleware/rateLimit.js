const buckets = new Map();

function createRateLimit({ name, windowMs, max, key = (req) => req.ip || req.socket.remoteAddress || 'unknown' }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${name}:${key(req)}`;
    const current = buckets.get(bucketKey);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, message: '请求过于频繁，请稍后重试' });
    }

    if (buckets.size > 10000) {
      for (const [storedKey, storedBucket] of buckets) {
        if (storedBucket.resetAt <= now) buckets.delete(storedKey);
      }
    }
    next();
  };
}

function clearRateLimits() {
  buckets.clear();
}

module.exports = { clearRateLimits, createRateLimit };
