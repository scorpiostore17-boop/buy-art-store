export const normalizePhone = (v = '') => {
  let s = v.replace(/[\s.\-()]/g, '');
  if (s.startsWith('+213')) s = '0' + s.slice(4);
  else if (s.startsWith('00213')) s = '0' + s.slice(5);
  return s;
};
// Algerian mobile (05/06/07) and landline numbers
export const isPhone = (v) => /^0[1-9]\d{7,8}$/.test(normalizePhone(v));
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || '');
