import { getLocalImages } from './localStore';

export const isCloudinaryConfigured = true;
export const IMAGE_WIDTHS = [320, 480, 720, 1080, 1600];

export function cldUrl(url, { w, h, crop } = {}) {
  if (url?.startsWith('local-image:')) return getLocalImages()[url.slice('local-image:'.length)]?.url || '';
  return url || '';
}

export function cldSrcSet() {
  // No image CDN is used here, so duplicate URL candidates would mislead the browser.
  return undefined;
}

async function compressImage(file) {
  if (!('createImageBitmap' in window)) return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { alpha: true });
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  return blob || file;
}

async function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Image upload failed'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadImage(file, { folder = 'store' } = {}) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image is larger than 10 MB.');

  const dataUrl = await toDataUrl(await compressImage(file));
  const signedResponse = await fetch(`/api/admin/cloudinary/signature?folder=${encodeURIComponent(folder)}`, { credentials: 'same-origin' });
  const signed = await signedResponse.json().catch(() => ({}));
  if (!signedResponse.ok) throw new Error(signed.error || 'Could not prepare image upload');
  const payload = new FormData();
  payload.append('file', dataUrl);
  payload.append('api_key', signed.api_key);
  payload.append('timestamp', String(signed.timestamp));
  payload.append('signature', signed.signature);
  payload.append('folder', signed.folder);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signed.cloud_name)}/image/upload`, { method: 'POST', body: payload });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error?.message || 'Cloudinary image upload failed');
  return { url: result.secure_url, publicId: result.public_id };
}
