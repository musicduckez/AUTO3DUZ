import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ui/ProductCard';
import { useShopStore } from '../store/useShopStore';

export function Wishlist() {
  const { t } = useTranslation();
  const products = useShopStore((s) => s.products);
  const wishlist = useShopStore((s) => s.wishlist);
  const items = wishlist.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  return (
    <div>
      <h1 className="mb-6 font-display text-4xl font-bold">{t('nav_wishlist')}</h1>
      {!items.length ? (
        <div className="glass rounded-3xl p-10 text-center">
          <p>{t('empty_wish')}</p>
          <Link to="/catalog" className="mt-4 inline-block text-neon-300">
            {t('from_catalog')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((p) => (p ? <ProductCard key={p.id} product={p} /> : null))}
        </div>
      )}
    </div>
  );
}
