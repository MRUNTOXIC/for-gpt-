import { API_BASE } from '../services/api';

export function getFullImageUrl(imageUrl: string | undefined): string {
  if (!imageUrl) return '';

  // Already a full URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // Relative URL - construct full domain with uploads path
  const base = API_BASE.replace(/\/api\/?$/, '');
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  return `${base}${path}`;
}
