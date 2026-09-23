import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useShopStore } from '../../store/useShopStore';
import { formatSom } from '../../lib/currency';

export function SearchModal() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const open = useShopStore((s) => s.searchOpen);
  const setOpen = useShopStore((s) => s.setSearchOpen);
  const products = useShopStore((s) => s.products);
  const [q, setQ] = useState('');

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 8);
    return products
      .filter(
        (p) =>
          p.name.ru.toLowerCase().includes(s) ||
          p.name.uz.toLowerCase().includes(s) ||
          p.brand.toLowerCase().includes(s) ||
          p.category.includes(s),
      )
      .slice(0, 12);
  }, [products, q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 p-4" onClick={() => setOpen(false)}>
      <div className="glass mx-auto mt-24 max-w-xl rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('search')}
          className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-neon-400"
        />
        <ul className="mt-3 max-h-80 space-y-1 overflow-auto">
          {hits.map((p) => (
            <li key={p.id}>
              <Link
                to={`/product/${p.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-white/5"
              >
                <span>{p.name[lang]}</span>
                <span className="text-sm text-neon-300">{formatSom(p.price)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
