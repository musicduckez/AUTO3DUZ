import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';

export function Compare() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const compare = useShopStore((s) => s.compare);
  const toggleCompare = useShopStore((s) => s.toggleCompare);
  const items = compare.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const keys = Array.from(new Set(items.flatMap((p) => (p ? Object.keys(p.specs) : []))));

  if (!items.length) {
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p>{t('empty_compare')}</p>
        <Link to="/catalog" className="mt-4 inline-block text-neon-300">
          {t('from_catalog')}
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <h1 className="mb-6 font-display text-4xl font-bold">{t('nav_compare')}</h1>
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr>
            <th />
            {items.map((p) =>
              p ? (
                <th key={p.id} className="p-3 text-left">
                  <p className="font-display text-lg">{p.name[lang]}</p>
                  <p className="text-neon-300">{formatSom(p.price)}</p>
                  <button className="mt-2 text-xs text-rose-200" onClick={() => toggleCompare(p.id)}>
                    {t('remove')}
                  </button>
                </th>
              ) : null,
            )}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-white/10">
            <td className="p-3 text-violet-200/60">{t('brand_label')}</td>
            {items.map((p) => (
              <td key={p!.id} className="p-3">
                {p!.brand}
              </td>
            ))}
          </tr>
          {keys.map((k) => (
            <tr key={k} className="border-t border-white/5">
              <td className="p-3 text-violet-200/60">{k}</td>
              {items.map((p) => (
                <td key={p!.id + k} className="p-3">
                  {p!.specs[k] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
