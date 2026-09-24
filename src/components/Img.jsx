import { useState } from 'react';
import { cldSrcSet, cldUrl } from '../services/cloudinary';

/** Responsive Cloudinary image with lazy loading and a graceful placeholder. */
export default function Img({ src, alt = '', sizes = '100vw', ratio, className = '', eager = false, width = 720 }) {
  const [failed, setFailed] = useState(false);
  const style = ratio ? { aspectRatio: ratio } : undefined;
  if (!src || failed) return <div className={`img-ph ${className}`} style={style} role="img" aria-label={alt} />;
  return (
    <img
      className={className}
      style={style}
      src={cldUrl(src, { w: width })}
      srcSet={cldSrcSet(src)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
