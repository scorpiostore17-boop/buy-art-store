import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <section className="state" aria-labelledby="not-found-title">
        <p style={{ fontSize: 'clamp(3rem, 12vw, 7rem)', lineHeight: 1, fontWeight: 800, color: 'var(--primary)' }}>404</p>
        <h1 id="not-found-title">الصفحة غير موجودة</h1>
        <p>يبدو أن الرابط الذي أدخلته غير صحيح أو أن الصفحة لم تعد متاحة.</p>
        <Link className="btn btn-primary" to="/">العودة إلى الصفحة الرئيسية</Link>
      </section>
    </div>
  );
}
