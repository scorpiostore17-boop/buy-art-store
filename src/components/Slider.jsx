import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from './Img';
import { ChevronLeft, ChevronRight } from './Icons';

function SlideLink({ href, className, children }) {
  if (!href) return null;
  return /^https?:\/\//.test(href)
    ? <a className={className} href={href} target="_blank" rel="noreferrer">{children}</a>
    : <Link className={className} to={href}>{children}</Link>;
}

export default function Slider({ slides, interval = 6000 }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = slides.length;
  const go = useCallback((d) => setI((x) => (x + d + n) % n), [n]);

  useEffect(() => {
    if (n < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setInterval(() => go(1), interval);
    return () => clearInterval(t);
  }, [n, paused, go, interval]);

  useEffect(() => { if (i >= n) setI(0); }, [n, i]);
  if (!n) return null;

  return (
    <section className="slider" aria-roledescription="carousel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="slider-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, idx) => (
          <div className="slide" key={s.id} aria-hidden={idx !== i} role="group" aria-label={`Slide ${idx + 1} of ${n}`}>
            <Img src={s.image_url} alt={s.title || ''} ratio="21 / 9" sizes="100vw" width={1600} eager={idx === 0} />
            {(s.title || s.description || s.button_text) && (
              <div className="slide-copy">
                {s.title && <h2>{s.title}</h2>}
                {s.description && <p>{s.description}</p>}
                {s.button_text && <SlideLink href={s.button_link || '/shop'} className="btn btn-light">{s.button_text}</SlideLink>}
              </div>
            )}
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button className="slider-nav prev" onClick={() => go(-1)} aria-label="Previous slide"><ChevronLeft /></button>
          <button className="slider-nav next" onClick={() => go(1)} aria-label="Next slide"><ChevronRight /></button>
          <div className="slider-dots">
            {slides.map((s, idx) => (
              <button key={s.id} className={idx === i ? 'is-active' : ''} onClick={() => setI(idx)} aria-label={`Go to slide ${idx + 1}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
