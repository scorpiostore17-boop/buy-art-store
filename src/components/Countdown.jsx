import useCountdown from '../hooks/useCountdown';

const pad = (n) => String(n).padStart(2, '0');

export default function Countdown({ target, onDone }) {
  const c = useCountdown(target, onDone);
  if (!c.ready) return <div className="countdown" aria-hidden="true" />;
  const parts = [['Days', c.days], ['Hours', c.hours], ['Min', c.minutes], ['Sec', c.seconds]];
  return (
    <div className="countdown" role="timer" aria-label={`${c.days} days ${c.hours} hours ${c.minutes} minutes ${c.seconds} seconds`}>
      {parts.map(([label, n]) => (
        <div key={label} className="countdown-cell">
          <strong>{pad(n)}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
