/** Approximate city centers for nearest-lounge matching (Pakistan). */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Gujrat: { lat: 32.5739, lng: 74.0789 },
  Kharian: { lat: 32.811, lng: 73.865 },
  Jhelum: { lat: 32.940, lng: 73.728 },
  Sargodha: { lat: 32.0836, lng: 72.6711 },
  Daska: { lat: 32.3242, lng: 74.3508 },
  Mirpur: { lat: 33.1478, lng: 73.7511 },
  "Lala Musa": { lat: 32.6306, lng: 73.9603 },
};

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestCity(lat: number, lng: number, cities: string[]) {
  let best: string | null = null;
  let bestKm = Infinity;
  for (const city of cities) {
    const c = CITY_COORDS[city];
    if (!c) continue;
    const km = haversineKm(lat, lng, c.lat, c.lng);
    if (km < bestKm) {
      bestKm = km;
      best = city;
    }
  }
  return best;
}
