import { useState } from 'react';
import Img from './Img';
import { ChevronLeft, ChevronRight } from './Icons';

export default function ProductGallery({ images, alt }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [{ id: 'none', url: '' }];
  const cur = list[Math.min(i, list.length - 1)];
  const go = (d) => setI((n) => (n + d + list.length) % list.length);
  return (
    <div className="gallery">
      <div className="gallery-main">
        <Img src={cur.url} alt={alt} ratio="4 / 5" sizes="(min-width: 900px) 50vw, 100vw" width={1080} eager />
        {list.length > 1 && (
          <>
            <button className="gallery-nav prev" onClick={() => go(-1)} aria-label="Previous image"><ChevronLeft /></button>
            <button className="gallery-nav next" onClick={() => go(1)} aria-label="Next image"><ChevronRight /></button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="gallery-thumbs">
          {list.map((img, idx) => (
            <button key={img.id} className={idx === i ? 'is-active' : ''} onClick={() => setI(idx)} aria-label={`Show image ${idx + 1}`}>
              <Img src={img.url} alt="" ratio="1 / 1" sizes="90px" width={180} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
