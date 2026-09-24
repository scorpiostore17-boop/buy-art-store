import { Link } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { useSettings } from '../context/SettingsContext';
import useAsync from '../hooks/useAsync';
import { adminStats, recentOrders } from '../services/adminApi';
import { formatDate } from '../utils/format';
import { PageHead, STATUSES, StatusBadge, cap } from './ui';

export default function Dashboard() {
  const { money } = useSettings();
  const stats = useAsync(adminStats, []);
  const recent = useAsync(() => recentOrders(8), []);

  if (stats.loading) return <Loading />;
  if (stats.error) return <ErrorState message={stats.error} onRetry={stats.reload} />;
  const s = {
    products: 0,
    orders: 0,
    revenue: 0,
    units_sold: 0,
    low_stock: 0,
    low_stock_items: [],
    daily: [],
    by_status: {},
    top_products: [],
    ...stats.data,
  };
  const maxRev = Math.max(1, ...s.daily.map((d) => Number(d.revenue)));

  const cards = [
    ['Revenue', money(s.revenue), 'Excludes cancelled orders'],
    ['Total sales', `${s.units_sold} items`, 'Units sold'],
    ['Orders', s.orders, `${s.by_status.pending || 0} pending`],
    ['Products', s.products, ''],
    ['Low stock', s.low_stock, 'Variants at or below the threshold'],
  ];

  return (
    <>
      <PageHead title="Dashboard" subtitle="A quick look at how the store is doing." />
      <div className="stat-grid">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="stat">
            <small>{label}</small>
            <strong>{value}</strong>
            {hint && <span>{hint}</span>}
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="panel">
          <h2>Revenue · last 14 days</h2>
          <div className="bars" role="img" aria-label="Daily revenue for the last 14 days">
            {s.daily.map((d) => (
              <div key={d.day} className="bar" title={`${d.day}: ${money(d.revenue)} · ${d.orders} orders`}>
                <span style={{ height: `${(Number(d.revenue) / maxRev) * 100}%` }} />
                <small>{d.day.slice(8)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Orders by status</h2>
          <ul className="status-list">
            {STATUSES.map((st) => (
              <li key={st}><StatusBadge status={st} /><strong>{s.by_status[st] || 0}</strong></li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Recent orders</h2><Link to="/admin/orders" className="link-btn">View all</Link></div>
          {recent.loading ? <Loading inline /> : recent.error ? <ErrorState message={recent.error} onRetry={recent.reload} /> : (
            <table className="table">
              <tbody>
                {(recent.data || []).map((o) => (
                  <tr key={o.id}>
                    <td>#{o.order_number}</td><td>{o.customer_name}</td><td>{money(o.total)}</td><td><StatusBadge status={o.status} /></td>
                    <td className="muted">{formatDate(o.created_at, { dateStyle: 'medium' })}</td>
                  </tr>
                ))}
                {!recent.data?.length && <tr><td className="muted">No orders yet.</td></tr>}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel">
          <h2>Low stock</h2>
          {s.low_stock_items.length === 0 ? <p className="muted">Everything is well stocked.</p> : (
            <ul className="plain">
              {s.low_stock_items.map((i, k) => (
                <li key={k} className="sum-row"><span>{i.name} <small className="muted">{[i.size !== 'One size' && i.size, i.color_name].filter(Boolean).join(' / ')}</small></span><strong className={i.stock === 0 ? 'text-danger' : ''}>{i.stock}</strong></li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Best sellers</h2>
          {s.top_products.length === 0 ? <p className="muted">No sales yet.</p> : (
            <ul className="plain">
              {s.top_products.map((p) => (
                <li key={p.name} className="sum-row"><span>{p.name}</span><span>{p.qty} sold · {money(p.revenue)}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="muted small">Status labels: {STATUSES.map(cap).join(', ')}.</p>
    </>
  );
}
