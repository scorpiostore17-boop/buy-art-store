import { useEffect, useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { listOrderItems, listOrders, updateOrderStatus } from '../services/adminApi';
import { formatDate } from '../utils/format';
import { Modal, PageHead, STATUSES, StatusBadge, cap } from './ui';

const PAGE = 15;

function OrderDetails({ order, onClose, onChanged }) {
  const { money } = useSettings();
  const toast = useToast();
  const items = useAsync(() => listOrderItems(order.id), [order.id]);
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);

  const change = async (next) => {
    const prev = status;
    setStatus(next);
    setBusy(true);
    try {
      await updateOrderStatus(order.id, next);
      toast.success(`Order #${order.order_number} is now ${next}`);
      onChanged();
    } catch (e) {
      setStatus(prev);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Order #${order.order_number}`} onClose={onClose} wide>
      <div className="detail-grid">
        <div>
          <h3>Customer</h3>
          <p><strong>{order.customer_name}</strong><br /><a href={`tel:${order.phone}`}>{order.phone}</a>{order.email && <><br /><a href={`mailto:${order.email}`}>{order.email}</a></>}</p>
          <h3>Delivery</h3>
          <p>{order.address}{order.neighborhood && `, ${order.neighborhood}`}<br />{order.municipality}, {order.wilaya}</p>
          {order.note && <><h3>Note</h3><p>{order.note}</p></>}
          <p className="muted small">Placed {formatDate(order.created_at)}</p>
        </div>
        <div>
          <h3>Status</h3>
          <select value={status} disabled={busy} onChange={(e) => change(e.target.value)} aria-label="Order status">
            {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
          </select>
          <p className="muted small">Cancelling an order returns its items to stock automatically.</p>
        </div>
      </div>

      <h3>Items</h3>
      {items.loading ? <Loading inline /> : items.error ? <ErrorState message={items.error} onRetry={items.reload} /> : (
        <table className="table">
          <thead><tr><th>Product</th><th>Variant</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            {items.data.map((i) => (
              <tr key={i.id}>
                <td>{i.product_name}</td>
                <td>{[i.size !== 'One size' && i.size, i.color_name].filter(Boolean).join(' / ') || '-'}</td>
                <td>{i.quantity}</td><td>{money(i.unit_price)}</td><td>{money(i.unit_price * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="totals">
        <div className="sum-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
        <div className="sum-row"><span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span>−{money(order.discount)}</span></div>
        <div className="sum-row"><span>Shipping</span><span>{money(order.shipping)}</span></div>
        <div className="sum-row total"><span>Total</span><span>{money(order.total)}</span></div>
      </div>
    </Modal>
  );
}

export default function Orders() {
  const { money } = useSettings();
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebounce(search, 300);
  const [open, setOpen] = useState(null);
  const orders = useAsync(() => listOrders({ page, pageSize: PAGE, status, search: q }), [page, status, q]);

  useEffect(() => setPage(0), [status, q]);
  const total = orders.data?.count || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHead title="Orders & sales" subtitle={`${total} order${total === 1 ? '' : 's'}`}>
        <input type="search" placeholder="Search name, phone, wilaya or #" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search orders" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{cap(s)}</option>)}
        </select>
      </PageHead>

      {orders.error ? <ErrorState message={orders.error} onRetry={orders.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Customer</th><th>Wilaya</th><th>Total</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>
              {orders.loading && <tr><td colSpan={7}><Loading inline /></td></tr>}
              {!orders.loading && orders.data?.rows.map((o) => (
                <tr key={o.id}>
                  <td>#{o.order_number}</td>
                  <td>{o.customer_name}<br /><small className="muted">{o.phone}</small></td>
                  <td>{o.wilaya}</td>
                  <td>{money(o.total)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="muted">{formatDate(o.created_at)}</td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => setOpen(o)}>View</button></td>
                </tr>
              ))}
              {!orders.loading && !orders.data?.rows.length && <tr><td colSpan={7} className="muted">No orders found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="pager">
        <button className="btn btn-outline btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span className="muted">Page {page + 1} of {pages}</span>
        <button className="btn btn-outline btn-sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {open && <OrderDetails order={open} onClose={() => setOpen(null)} onChanged={() => orders.reload(true)} />}
    </>
  );
}
