import { Link } from 'react-router-dom';
import CtaLink from '../components/CtaLink';
import DropSection from '../components/DropSection';
import ErrorState from '../components/ErrorState';
import Img from '../components/Img';
import Loading, { SkeletonGrid } from '../components/Loading';
import ProductGrid from '../components/ProductGrid';
import Slider from '../components/Slider';
import { ArrowRight } from '../components/Icons';
import { useCatalog } from '../context/CatalogContext';
import { useSettings } from '../context/SettingsContext';
import useAsync from '../hooks/useAsync';
import { fetchLandingSections, fetchSliders } from '../services/api';

function Landing() {
  const { logoSrc, settings } = useSettings();
  const logo = settings.landing_logo_url || logoSrc;
  const background = settings.landing_background_url;
  return (
    <section className="landing-page" style={background ? { '--landing-image': `url(${JSON.stringify(background)})` } : undefined}>
      <div className="landing-wash" aria-hidden="true" />
      <div className="landing-content">
        <img className="landing-logo" src={logo} alt={settings.store_name} width="560" height="560" />
        <p className="landing-kicker">{settings.landing_description || settings.store_name}</p>
        <Link className="btn btn-primary landing-cta" to="/shop">Discover Products <ArrowRight width={19} height={19} /></Link>
      </div>
    </section>
  );
}

function StoreIntro() {
  const { settings } = useSettings();
  return (
    <section className="section store-intro-section">
      <div className="container store-intro">
        <p className="eyebrow">{settings.store_name}</p>
        <h2>Art that belongs in your everyday.</h2>
        <p className="lead">Discover thoughtfully selected pieces made to bring more character, color, and feeling into the spaces you live in.</p>
      </div>
    </section>
  );
}

function SectionHead({ s, linkText, linkTo }) {
  return (
    <div className="section-head">
      <div>
        {s.title && <h2>{s.title}</h2>}
        {s.description && <p className="muted">{s.description}</p>}
      </div>
      {(linkText || s.cta_text) && (linkTo || s.cta_link) && (
        <Link className="link-arrow" to={linkTo || s.cta_link}>{linkText || s.cta_text} <ArrowRight width={16} height={16} /></Link>
      )}
    </div>
  );
}

function Hero({ s }) {
  const { logoSrc, settings } = useSettings();
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1 className="sticker-text">{s.title}</h1>
          {s.description && <p className="lead">{s.description}</p>}
          <div className="hero-cta">
            <CtaLink href={s.cta_link} className="btn btn-primary btn-lg">{s.cta_text}</CtaLink>
            <CtaLink href={s.cta2_link} className="btn btn-outline btn-lg">{s.cta2_text}</CtaLink>
          </div>
        </div>
        <div className="hero-art">
          <div className="sticker-frame">
            {s.image_url
              ? <Img src={s.image_url} alt={s.title || settings.store_name} ratio="4 / 5" sizes="(min-width: 900px) 40vw, 90vw" width={1080} eager />
              : <img className="hero-logo" src={logoSrc} alt={settings.store_name} />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Categories({ s }) {
  const { categories } = useCatalog();
  const list = categories.slice(0, s.items_limit || 8);
  if (!list.length) return null;
  return (
    <section className="section categories-section">
      <div className="container">
        <SectionHead s={s} />
        <div className="category-grid">
          {list.map((c) => (
            <Link key={c.id} to={`/shop?category=${c.slug}`} className="category-card">
              <Img src={c.image_url} alt="" ratio="1 / 1" sizes="(min-width: 900px) 20vw, 45vw" />
              <span>{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductsSection({ s, pick, alt }) {
  const { products, loading, error, reload } = useCatalog();
  const list = pick(products).slice(0, s.items_limit || 8);
  if (!loading && !error && !list.length) return null;
  return (
    <section className={`section${alt ? ' section-soft' : ''}`}>
      <div className="container">
        <SectionHead s={s} />
        {loading ? <SkeletonGrid count={4} /> : error ? <ErrorState message={error} onRetry={reload} /> : <ProductGrid products={list} />}
      </div>
    </section>
  );
}

function Promo({ s, reverse }) {
  return (
    <section className="section">
      <div className={`container promo${reverse ? ' reverse' : ''}`}>
        <div className="promo-media">
          <div className="sticker-frame small"><Img src={s.image_url} alt={s.title || ''} ratio="4 / 3" sizes="(min-width: 900px) 45vw, 90vw" /></div>
        </div>
        <div className="promo-copy">
          {s.title && <h2>{s.title}</h2>}
          {s.description && <p className="lead">{s.description}</p>}
          <CtaLink href={s.cta_link}>{s.cta_text}</CtaLink>
        </div>
      </div>
    </section>
  );
}

function Intro({ s }) {
  const { logoSrc, settings } = useSettings();
  return (
    <section className="section intro">
      <div className="container intro-inner">
        <img src={logoSrc} alt={settings.store_name} width="130" height="128" loading="lazy" />
        {s.title && <h2>{s.title}</h2>}
        {s.description && <p className="lead pre">{s.description}</p>}
        <CtaLink href={s.cta_link} className="btn btn-outline">{s.cta_text}</CtaLink>
      </div>
    </section>
  );
}

export default function Home() {
  const sections = useAsync(fetchLandingSections, []);
  const slides = useAsync(() => fetchSliders('home'), []);

  if (sections.loading) return <Loading />;
  if (sections.error) return <div className="container"><ErrorState message={sections.error} onRetry={sections.reload} /></div>;
  const contentSections = (sections.data || []).filter((s) => s.key !== 'hero' && s.key !== 'categories');

  const render = (s) => {
    switch (s.key) {
      case 'hero': return <Hero key={s.id} s={s} />;
      case 'slider': return slides.data?.length ? <div key={s.id} className="container section-tight"><Slider slides={slides.data} /></div> : null;
      case 'categories': return <Categories key={s.id} s={s} />;
      case 'featured': return <ProductsSection key={s.id} s={s} pick={(p) => p.filter((x) => x.is_featured)} />;
      case 'new_arrivals': return <ProductsSection key={s.id} s={s} alt pick={(p) => p} />;
      case 'drop': return <DropSection key={s.id} section={s} />;
      case 'promo_1': return <Promo key={s.id} s={s} />;
      case 'promo_2': return <Promo key={s.id} s={s} reverse />;
      case 'intro': return <Intro key={s.id} s={s} />;
      default: return null;
    }
  };
  return <><Landing /><StoreIntro />{contentSections.map(render)}</>;
}
