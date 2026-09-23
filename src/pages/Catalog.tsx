import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ui/ProductCard';
import { useShopStore } from '../store/useShopStore';
import type { Category } from '../types';

const cats: Category[] = ['cpu', 'gpu', 'mb', 'ram', 'storage', 'psu', 'case', 'cooler', 'fan'];

export function Catalog() {
  const { t } = useTranslation();
  const { category } = useParams();
  const products = useShopStore((s) => s.products);
  const [sort, setSort] = useState('pop');
  const [q, setQ] = useState('');
  const [stock, setStock] = useState(false);
  const active = cats.includes(category as Category) ? (category as Category) : undefined;

  const list = useMemo(() => {
    let items = products.filter((p) => (!active || p.category === active) && (!stock || p.stock > 0));
    if (q.trim()) {
      const s = q.toLowerCase();
      items = items.filter((p) => p.name.ru.toLowerCase().includes(s) || p.name.uz.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s));
    }
    items = [...items].sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'rating') return b.rating - a.rating;
      return Number(b.featured) - Number(a.featured);
    });
    return items;
  }, [products, active, sort, q, stock]);

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">{active ? t(`cat_${active}`) : t('all_products')}</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/catalog" className={`rounded-full px-3 py-1 text-sm ${!active ? 'bg-neon-600' : 'bg-white/5'}`}>
          {t('all_products')}
        </Link>
        {cats.map((c) => (
          <Link key={c} to={`/catalog/${c}`} className={`rounded-full px-3 py-1 text-sm ${active === c ? 'bg-neon-600' : 'bg-white/5'}`}>
            {t(`cat_${c}`)}
          </Link>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search')}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm">
          <option value="pop">{t('sort_pop')}</option>
          <option value="price_asc">{t('sort_price_asc')}</option>
          <option value="price_desc">{t('sort_price_desc')}</option>
          <option value="rating">{t('sort_rating')}</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />
          {t('in_stock')}
        </label>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
