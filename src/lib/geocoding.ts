export type LatLng = [number, number];

type GeocodeResult = {
  lat: number;
  lng: number;
  source: 'google' | 'nominatim';
};

const CACHE_PREFIX = 'geocode:v1:';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours

function cacheKey(query: string) {
  return `${CACHE_PREFIX}${query.trim().toLowerCase()}`;
}

function getCached(query: string): LatLng | null {
  try {
    const raw = localStorage.getItem(cacheKey(query));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { v: LatLng; exp: number };
    if (!parsed?.v || !parsed?.exp) return null;
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(cacheKey(query));
      return null;
    }
    return parsed.v;
  } catch {
    return null;
  }
}

function setCached(query: string, value: LatLng, ttlMs = DEFAULT_TTL_MS) {
  try {
    localStorage.setItem(cacheKey(query), JSON.stringify({ v: value, exp: Date.now() + ttlMs }));
  } catch {
    // ignore quota / private mode
  }
}

async function geocodeWithGoogle(query: string, apiKey: string): Promise<GeocodeResult | null> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

  // Note: selon la configuration Google, l'appel direct navigateur peut être bloqué (CORS / restrictions).
  const res = await fetch(url);
  if (!res.ok) {
    if (import.meta.env.DEV) console.warn('[geocode] Google HTTP error', res.status, query);
    return null;
  }
  const json = await res.json();
  if (json.status !== 'OK' || !json.results?.length) {
    if (import.meta.env.DEV) console.warn('[geocode] Google status', json.status, query);
    return null;
  }
  const loc = json.results[0]?.geometry?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return null;
  return { lat: loc.lat, lng: loc.lng, source: 'google' };
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`,
    {
      headers: {
        // Nominatim recommande un User-Agent, mais en navigateur on ne peut pas le définir.
        // On évite d’ajouter des headers custom pour ne pas déclencher de préflight inutile.
      },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.length) return null;
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng, source: 'nominatim' };
}

/**
 * Géocode une ville/adresse en coordonnée.
 * - Tente Google si `VITE_GOOGLE_MAPS_API_KEY` est dispo
 * - Sinon fallback Nominatim
 * - Cache localStorage pour accélérer et limiter les quotas
 */
export async function geocodeToLatLng(query: string): Promise<LatLng | null> {
  const normalized = query.trim();
  if (!normalized) return null;

  const cached = getCached(normalized);
  if (cached) return cached;

  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // 1) Google (si clé disponible)
  if (googleKey) {
    try {
      const result = await geocodeWithGoogle(normalized, googleKey);
      if (result) {
        const value: LatLng = [result.lat, result.lng];
        setCached(normalized, value);
        return value;
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[geocode] Google exception', normalized, e);
      // fallback
    }
  } else {
    if (import.meta.env.DEV) console.warn('[geocode] Google key absente, fallback Nominatim');
  }

  // 2) Fallback Nominatim
  try {
    const result = await geocodeWithNominatim(normalized);
    if (result) {
      const value: LatLng = [result.lat, result.lng];
      setCached(normalized, value);
      return value;
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[geocode] Nominatim exception', normalized, e);
  }

  return null;
}


