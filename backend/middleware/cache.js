/**
 * Lightweight in-memory cache middleware.
 * Uses a plain Map — no extra dependencies.
 * For multi-instance deployments swap this for Redis.
 */

const store = new Map(); // key → { data, expiresAt }

/**
 * Returns an Express middleware that caches the response for `ttlSeconds`.
 * Cache key = req.originalUrl (includes query string).
 */
function cache(ttlSeconds = 60) {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = req.originalUrl;
    const hit = store.get(key);

    if (hit && hit.expiresAt > Date.now()) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
      return res.json(hit.data);
    }

    // Intercept res.json to store the response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        store.set(key, { data: body, expiresAt: Date.now() + ttlSeconds * 1000 });
        // Evict if store grows too large (> 500 entries)
        if (store.size > 500) {
          const oldest = store.keys().next().value;
          store.delete(oldest);
        }
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

/** Bust all cache entries whose key starts with `prefix`. */
function bustCache(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

module.exports = { cache, bustCache };
