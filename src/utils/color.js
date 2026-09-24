/** Returns dark or light text, whichever is readable on the given hex background. */
export function readableOn(hex, dark = '#0A1330', light = '#FFFFFF') {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return light;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? dark : light;
}
export const isHex = (v) => /^#[0-9a-f]{6}$/i.test((v || '').trim());
