import { useEffect, useRef, useState } from 'react';
import { getServerOffset } from '../services/api';

/** Counts down to an ISO timestamp using the DATABASE clock (offset), not the browser's. */
export default function useCountdown(target, onDone) {
  const [offset, setOffset] = useState(null);
  const [now, setNow] = useState(Date.now());
  const doneFor = useRef(null);
  const cb = useRef(onDone);
  cb.current = onDone;

  useEffect(() => {
    let alive = true;
    getServerOffset().then((o) => alive && setOffset(o));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = offset === null || !target ? null : new Date(target).getTime() - (now + offset);

  useEffect(() => {
    if (remaining !== null && remaining <= 0 && doneFor.current !== target) {
      doneFor.current = target;
      cb.current?.();
    }
  }, [remaining, target]);

  if (remaining === null) return { ready: false, done: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
  const s = Math.max(0, Math.floor(remaining / 1000));
  return {
    ready: true,
    done: remaining <= 0,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}
