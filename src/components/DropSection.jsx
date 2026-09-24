import { Link } from 'react-router-dom';
import Countdown from './Countdown';
import ProductGrid from './ProductGrid';
import Img from './Img';
import useAsync from '../hooks/useAsync';
import { fetchDrops } from '../services/api';
import { useCatalog } from '../context/CatalogContext';

/**
 * Shows the live drop (countdown to its end + its products) or the next scheduled drop
 * (countdown to its start). Status comes from database timestamps.
 */
export default function DropSection({ section }) {
  const { data: drops, reload } = useAsync(fetchDrops, []);
  const catalog = useCatalog();

  const live = (drops || []).filter((d) => d.status === 'live').sort((a, b) => new Date(a.end_at) - new Date(b.end_at))[0];
  const next = (drops || []).filter((d) => d.status === 'scheduled').sort((a, b) => new Date(a.start_at) - new Date(b.start_at))[0];
  const drop = live || next;
  if (!drop) return null;

  const isLive = drop.status === 'live';
  const ids = new Set(drop.drop_products.map((x) => x.product_id));
  const products = catalog.products.filter((p) => ids.has(p.id)).slice(0, section?.items_limit || 8);

  // when the countdown hits zero, ask the database for the new status and refresh visible products
  const onDone = () => { reload(true); catalog.reload(); };

  return (
    <section className="section drop">
      <div className="container">
        <div className="drop-hero">
          <Img src={drop.banner_url} alt="" ratio="16 / 7" sizes="100vw" width={1600} className="drop-bg" />
          <div className="drop-copy">
            <span className="eyebrow">{isLive ? 'Live now' : 'Coming soon'}</span>
            <h2 className="sticker-text">{drop.name}</h2>
            {drop.description && <p>{drop.description}</p>}
            <p className="drop-until">{isLive ? 'Ends in' : 'Starts in'}</p>
            <Countdown target={isLive ? drop.end_at : drop.start_at} onDone={onDone} />
            {isLive && section?.cta_text && <Link className="btn btn-light" to={section.cta_link || '/shop'}>{section.cta_text}</Link>}
          </div>
        </div>
        {isLive && products.length > 0 && <ProductGrid products={products} />}
      </div>
    </section>
  );
}
