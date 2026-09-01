import type { Property } from '../types/Property';

export type LatLng = { latitude: number; longitude: number };

export function parseCoordinate(value?: string | number): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function propertyLocation(property: Property): LatLng | null {
  const latitude = parseCoordinate(property.latitude);
  const longitude = parseCoordinate(property.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude };
}

export function getDistanceKm(origin: LatLng, target: LatLng) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(target.latitude - origin.latitude);
  const dLon = toRad(target.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(target.latitude);

  const a = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return 6371 * c;
}

export function nearbyProperties(properties: Property[], origin: LatLng, maxKm = 10) {
  return properties
    .map((property) => {
      const location = propertyLocation(property);
      if (!location) return null;
      const distance = getDistanceKm(origin, location);
      return distance <= maxKm ? { property, distance } : null;
    })
    .filter((item): item is { property: Property; distance: number } => item !== null)
    .sort((a, b) => a.distance - b.distance)
    .map((item) => item.property);
}
