import { Heart, Layers, ShoppingCart, Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatSom } from '../../lib/currency';
import { useShopStore } from '../../store/useShopStore';
import type { Product } from '../../types';

export function ProductThumb({ product, className = '' }: { product: Product; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: `linear-gradient(145deg, hsl(${product.hue} 70% 18%), hsl(${product.hue + 40} 80% 10%))`,
      }}
    >
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,white,transparent_35%)]" />
      <div className="relative grid h-full place-items-center p-6">
        <Cpu className="h-16 w-16 text-white/80" />
        <span className="mt-2 text-xs uppercase tracking-[0.2em] text-white/70">{product.category}</span>
      </div>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const wishlist = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const addCart = useShopStore((s) => s.addCart);
  const toggleWish = useShopStore((s) => s.toggleWish);
  const toggleCompare = useShopStore((s) => s.toggleCompare);
  const setSlot = useShopStore((s) => s.setSlot);
  const toast = useShopStore((s) => s.toast);

  return (
    <article className="glass card-tilt group flex flex-col overflow-hidden rounded-3xl shadow-card">
      <Link to={`/product/${product.id}`} className="block">
        <ProductThumb product={product} className="h-44" />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-neon-300/70">{product.brand}</p>
            <Link to={`/product/${product.id}`} className="font-display text-sm font-semibold leading-snug hover:text-neon-300">
              {product.name[lang]}
            </Link>
          </div>
          <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-violet-200">★ {product.rating}</span>
        </div>
        <p className="font-display text-lg font-bold text-neon-300">{formatSom(product.price)}</p>
        <p className={`text-xs ${product.stock > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {product.stock > 0 ? `${t('in_stock')} · ${product.stock}` : t('out_stock')}
        </p>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <button
            className="flex items-center justify-center gap-1 rounded-xl bg-neon-600 px-3 py-2 text-sm font-semibold hover:bg-neon-500"
            onClick={() => {
              addCart(product.id);
              toast(t('toast_cart'));
            }}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="h-4 w-4" /> {t('add_cart')}
          </button>
          <button
            className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-neon-400"
            onClick={() => {
              setSlot(product.category, product.id);
              toast(t('toast_build'));
            }}
          >
            {t('add_build')}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs ${wishlist.includes(product.id) ? 'bg-pink-500/20 text-pink-200' : 'bg-white/5'}`}
            onClick={() => {
              toggleWish(product.id);
              toast(t('toast_wish'));
            }}
          >
            <Heart className="h-3.5 w-3.5" /> {t('wishlist_add')}
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs ${compare.includes(product.id) ? 'bg-violet-500/20 text-violet-100' : 'bg-white/5'}`}
            onClick={() => {
              const ok = toggleCompare(product.id);
              toast(ok === false ? t('compare_max') : t('toast_compare'), ok === false ? 'err' : 'ok');
            }}
          >
            <Layers className="h-3.5 w-3.5" /> {t('compare_add')}
          </button>
        </div>
      </div>
    </article>
  );
}
