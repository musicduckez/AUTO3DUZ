import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProductCard, ProductThumb } from '../components/ui/ProductCard';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';

export function ProductPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const recent = useShopStore((s) => s.recent);
  const viewProduct = useShopStore((s) => s.viewProduct);
  const addCart = useShopStore((s) => s.addCart);
  const setSlot = useShopStore((s) => s.setSlot);
  const toast = useShopStore((s) => s.toast);
  const product = products.find((p) => p.id === id);

  useEffect(() => {
    if (id) viewProduct(id);
  }, [id, viewProduct]);

  if (!product) return <p>{t('not_found')}</p>;
  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  const recentItems = recent.map((rid) => products.find((p) => p.id === rid)).filter(Boolean);

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <ProductThumb product={product} className="h-80" />
        <div>
          <p className="text-sm text-neon-300">{product.brand}</p>
          <h1 className="font-display text-4xl font-bold">{product.name[lang]}</h1>
          <p className="mt-3 font-display text-3xl text-neon-300">{formatSom(product.price)}</p>
          <p className="mt-2 text-sm">{product.stock > 0 ? `${t('in_stock')} · ${product.stock}` : t('out_stock')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-2xl bg-neon-600 px-5 py-3 font-semibold"
              onClick={() => {
                addCart(product.id);
                toast(t('toast_cart'));
              }}
            >
              {t('add_cart')}
            </button>
            <button
              className="rounded-2xl border border-white/15 px-5 py-3"
              onClick={() => {
                setSlot(product.category, product.id);
                toast(t('toast_build'));
                nav('/builder');
              }}
            >
              {t('add_build')}
            </button>
          </div>
          <h2 className="mt-8 font-display text-xl font-bold">{t('specs')}</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {Object.entries(product.specs).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-white/5 py-2">
                <dt className="text-violet-200/60">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <section>
        <h2 className="mb-4 font-display text-2xl font-bold">{t('related')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      {recentItems.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-bold">{t('recently')}</h2>
          <div className="flex flex-wrap gap-3">
            {recentItems.map((p) =>
              p ? (
                <Link key={p.id} to={`/product/${p.id}`} className="glass rounded-xl px-3 py-2 text-sm">
                  {p.name[lang]}
                </Link>
              ) : null,
            )}
          </div>
        </section>
      )}
    </div>
  );
}
