// reverseGeocode.js (ESM) — Electron main process (Node 18+)
// - Nominatim reverse (HTTPS)
// - Policy-friendly headers (User-Agent required; Referer optional)
// - Global 1 req/sec rate limiting
// - LRU memory cache with coordinate quantization ("grid cache")

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";

/* ---------------- LRU Cache ---------------- */

class LRUCache {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key) {
    if (!this.map.has(key)) return undefined;
    const val = this.map.get(key);
    // refresh
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }

  set(key, val) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, val);
    if (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }

  has(key) {
    return this.map.has(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

// Single shared cache across module usage (per app session)
const _cache = new LRUCache(1000);

/* ---------------- Rate limiting ---------------- */

let lastCallTimestamp = 0;
let requestQueue = Promise.resolve();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------------- Mapping helpers ---------------- */

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const val = obj?.[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
};

const mapToXmp = (address = {}) => {
  const City = pickFirst(address, ["city", "town", "village", "municipality", "hamlet"]);
  const ProvinceState = pickFirst(address, ["state", "region"]);
  const Country = pickFirst(address, ["country"]);
  const cc = pickFirst(address, ["country_code"]);
  const CountryCode = cc ? cc.toUpperCase() : "";

  return {
    City,
    "Province-State": ProvinceState,
    Country,
    ...(CountryCode ? { CountryCode } : {})
  };
};

// Quantize lat/lon into a grid key (fast cache key)
// precisionDigits: 3 => ~110m, 4 => ~11m, 5 => ~1m (latitude approx)
const makeGridKey = (lat, lon, precisionDigits = 4) =>
  `${lat.toFixed(precisionDigits)},${lon.toFixed(precisionDigits)}`;

/* ---------------- Public API ---------------- */

/**
 * Reverse geocode coordinates → normalized XMP fields (with LRU cache).
 *
 * @param {number} lat
 * @param {number} lon
 * @param {object} [options]
 * @param {string} options.userAgent        REQUIRED (identify your app + contact)
 * @param {string} [options.referer]        Recommended (your site/app URL)
 * @param {number} [options.timeoutMs=8000]
 * @param {boolean}[options.rateLimit=true] Enforce 1 req/sec globally
 *
 * Cache options:
 * @param {boolean}[options.cache=true]
 * @param {number} [options.cacheMaxSize=1000] Only applied if you call configureCache
 * @param {number} [options.cachePrecision=4] Grid precision digits
 *
 * @returns {Promise<{City:string,"Province-State":string,Country:string,CountryCode?:string}>}
 */
export async function reverseGeocodeToXmp(
  lat,
  lon,
  {
    userAgent = "GpxTaggerApp (https://www.berg-reise-foto.de)",
    referer,
    timeoutMs = 8000,
    rateLimit = true,
    cache = true,
    cachePrecision = 4
  } = {}
) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new TypeError("reverseGeocodeToXmp: lat/lon must be finite numbers");
  }
  if (!userAgent) {
    throw new Error(
      "Nominatim requires an identifying User-Agent (e.g. 'MyApp/1.0 (contact@example.com)')"
    );
  }

  const cacheKey = cache ? makeGridKey(lat, lon, cachePrecision) : null;
  if (cacheKey) {
    const hit = _cache.get(cacheKey);
    if (hit) return hit;
  }

  const run = async () => {
    // Rate limit: max 1 request per second (global)
    if (rateLimit) {
      const now = Date.now();
      const wait = Math.max(0, 1000 - (now - lastCallTimestamp));
      if (wait > 0) await sleep(wait);
      lastCallTimestamp = Date.now();
    }

    const url = new URL(NOMINATIM_ENDPOINT);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lon));
    url.searchParams.set("addressdetails", "1");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          Accept: "application/json",
          ...(referer ? { Referer: referer } : {})
        },
        signal: controller.signal
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Nominatim error ${res.status}: ${text.slice(0, 300)}`);
      }

      const data = await res.json();
      const mapped = mapToXmp(data?.address || {});

      if (cacheKey) _cache.set(cacheKey, mapped);
      return mapped;
    } finally {
      clearTimeout(timeout);
    }
  };

  if (!rateLimit) return run();

  requestQueue = requestQueue.then(run, run);
  return requestQueue;
}

/**
 * Optional helpers (useful for tests / advanced control)
 */
export function clearReverseGeocodeCache() {
  _cache.clear();
}

export function getReverseGeocodeCacheSize() {
  return _cache.size;
}