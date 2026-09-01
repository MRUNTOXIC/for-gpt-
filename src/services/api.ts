import { Property } from '../types/Property';
import { MOCK_PROPERTIES } from './mockData';
import type { AuthUser, UserRole } from '../auth/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE as string | undefined) || 'https://www.ivantaproperty.com/api';

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function get(url: string, headers?: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...headers },
      signal: controller.signal,
    });
    clearTimeout(timer);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`GET ${url} failed with status ${res.status}: ${errorText}`);
      return null;
    }
    return await res.json();
  } catch (e: any) {
    clearTimeout(timer);
    console.warn(`Connection to ${url} failed:`, e.message);
    return null;
  }
}

async function post(url: string, body: object, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return await res.json();
  } catch { return null; }
}

async function put(url: string, body: object, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return await res.json();
  } catch { return null; }
}

async function patch(url: string, body: object, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return await res.json();
  } catch { return null; }
}

async function del(url: string, headers?: Record<string, string>) {
  try {
    const res = await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...headers } });
    return await res.json();
  } catch { return null; }
}

function userHeaders(userId: string): Record<string, string> { return { 'x-user-id': userId }; }

// ─── HELPERS ─────────────────────────────────────────────────────────────────
/** Returns true if the string looks like a MongoDB ObjectId (24 hex chars) */
function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

// ─── PUBLIC PROPERTY APIs ─────────────────────────────────────────────────────
export async function getProperties(filters?: Record<string, string>): Promise<Property[]> {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  const data = await get(`${API_BASE}/properties${params}`);

  if (!data || !data.success) {
    return MOCK_PROPERTIES;
  }

  return data?.data ?? data?.properties ?? [];
}

export async function getPropertiesByCategory(): Promise<Record<string, Property[]>> {
  const list = await getProperties();
  return list.reduce((acc: Record<string, Property[]>, p: Property) => {
    const cat = (p as any).category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});
}

export async function getPropertyById(id: string): Promise<Property | null> {
  // Skip the network call entirely for non-ObjectId IDs (mock data).
  // These would cause a 500 on the real API and waste a round-trip.
  if (!isObjectId(id)) {
    return MOCK_PROPERTIES.find(p => p._id === id) ?? null;
  }

  const data = await get(`${API_BASE}/properties/${id}`);
  if (!data || !data.success) {
    return MOCK_PROPERTIES.find(p => p._id === id) ?? null;
  }
  return data?.property ?? data?.data ?? null;
}

export async function searchProperties(query: string): Promise<Property[]> {
  const data = await get(`${API_BASE}/properties?search=${encodeURIComponent(query)}`);
  if (!data || !data.success) {
    return MOCK_PROPERTIES.filter(p => p.title.toLowerCase().includes(query.toLowerCase()));
  }
  return data?.data ?? data?.properties ?? [];
}

export async function getSimilarProperties(property: Property): Promise<Property[]> {
  const all = await getProperties();
  return all
    .filter(p => p._id !== property._id && (p.propertyType === property.propertyType || p.subType === property.subType))
    .slice(0, 4);
}

// ─── APP AUTH (Email) ─────────────────────────────────────────────────────────
export async function appEmailLogin(email: string, password: string = '', role: UserRole = 'User'): Promise<AuthUser | null> {
  const login = await post(`${API_BASE}/auth/login`, { email, password, role, isApp: true });
  if (!login?.success || !login?.token) return null;
  const exchange = await get(`${API_BASE}/auth/token-exchange?token=${encodeURIComponent(login.token)}`);
  if (!exchange?.success || !exchange?.userData) return null;
  const u = exchange.userData as any;
  return { id: String(u.id ?? u._id ?? ''), email: String(u.email ?? ''), name: String(u.name ?? ''), role: (u.role as UserRole) ?? 'User' };
}

// ─── FAVORITES — FULLY LOCAL (AsyncStorage only) ─────────────────────────────
// The favorites system works entirely offline. Full property objects are cached
// locally so there is zero network dependency for reading favorites.

// Key for property object cache: stores the full Property JSON per ID
const FAV_OBJ_KEY  = (userId: string) => `@favs_obj_${userId}`;
// Key for ID list (fast membership checks)
const FAV_IDS_KEY  = (userId: string) => `@favs_ids_${userId}`;

/** Read cached favorite property objects from AsyncStorage */
async function getCachedFavObjects(userId: string): Promise<Record<string, Property>> {
  try {
    const raw = await AsyncStorage.getItem(FAV_OBJ_KEY(userId));
    return raw ? (JSON.parse(raw) as Record<string, Property>) : {};
  } catch {
    return {};
  }
}

/** Write cached favorite property objects to AsyncStorage */
async function setCachedFavObjects(userId: string, map: Record<string, Property>): Promise<void> {
  try {
    await AsyncStorage.setItem(FAV_OBJ_KEY(userId), JSON.stringify(map));
  } catch {}
}

/** Read the ordered list of favorite IDs */
async function getLocalFavIds(userId: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAV_IDS_KEY(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Write the ordered list of favorite IDs */
async function setLocalFavIds(userId: string, ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAV_IDS_KEY(userId), JSON.stringify(ids));
  } catch {}
}

/**
 * Get the user's favorite properties — FULLY OFFLINE, no server calls.
 * Returns full Property objects from the local cache, in the order they were added.
 */
export async function getFavorites(userId: string): Promise<Property[]> {
  const ids     = await getLocalFavIds(userId);
  const objMap  = await getCachedFavObjects(userId);
  return ids
    .map(id => objMap[id])
    .filter(Boolean) as Property[];
}

/**
 * Add a property to favorites — saves locally immediately.
 * Optionally passes the full property object so it's available offline.
 */
export async function addFavorite(
  userId: string,
  propertyId: string,
  propertyObject?: Property,
): Promise<boolean> {
  // Update ID list
  const ids = await getLocalFavIds(userId);
  if (!ids.includes(propertyId)) {
    await setLocalFavIds(userId, [...ids, propertyId]);
  }

  // Cache the full property object if provided
  if (propertyObject) {
    const map = await getCachedFavObjects(userId);
    map[propertyId] = propertyObject;
    await setCachedFavObjects(userId, map);
  }

  return true;
}

/**
 * Remove a property from favorites — updates local cache immediately.
 */
export async function removeFavorite(userId: string, propertyId: string): Promise<boolean> {
  // Update ID list
  const ids = await getLocalFavIds(userId);
  await setLocalFavIds(userId, ids.filter(id => id !== propertyId));

  // Remove from object cache
  const map = await getCachedFavObjects(userId);
  delete map[propertyId];
  await setCachedFavObjects(userId, map);

  return true;
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export async function getSettings(): Promise<{ areas: string[]; landmarks: string[] }> {
  const data = await get(`${API_BASE}/settings`);
  return { areas: data?.data?.areas ?? [], landmarks: data?.data?.landmarks ?? [] };
}


