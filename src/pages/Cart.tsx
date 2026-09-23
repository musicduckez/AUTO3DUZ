import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';

export function Cart() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const cart = useShopStore((s) => s.cart);
  const setQty = useShopStore((s) => s.setQty);
  const removeCart = useShopStore((s) => s.removeCart);
  const rows = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }));
  const total = rows.reduce((s, r) => s + (r.product?.price ?? 0) * r.qty, 0);

  if (!cart.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p>{t('empty_cart')}</p>
        <Link to="/catalog" className="mt-4 inline-block text-neon-300">
          {t('continue')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.6fr]">
      <div className="space-y-3">
        {rows.map((r) =>
          r.product ? (
            <div key={r.productId} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
              <div>
                <p className="font-semibold">{r.product.name[lang]}</p>
                <p className="text-sm text-neon-300">{formatSom(r.product.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={r.qty}
                  onChange={(e) => setQty(r.productId, Number(e.target.value))}
                  className="w-16 rounded-lg bg-black/30 px-2 py-1"
                />
                <button className="text-sm text-rose-200" onClick={() => removeCart(r.productId)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          ) : null,
        )}
      </div>
      <aside className="glass h-fit rounded-3xl p-5">
        <p className="text-violet-200/70">{t('subtotal')}</p>
        <p className="font-display text-3xl font-bold text-neon-300">{formatSom(total)}</p>
        <Link to="/checkout" className="mt-4 block rounded-2xl bg-neon-600 py-3 text-center font-semibold">
          {t('checkout')}
        </Link>
      </aside>
    </div>
  );
}
