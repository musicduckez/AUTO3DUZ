import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { readyBuilds } from '../data/builds';
import { buildTotal, partById } from '../lib/compatibility';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';

export function Builds() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const setBuild = useShopStore((s) => s.setBuild);
  const addBuildToCart = useShopStore((s) => s.addBuildToCart);
  const toast = useShopStore((s) => s.toast);

  return (
    <div>
      <h1 className="font-display text-4xl font-bold">{t('builds_title')}</h1>
      <p className="mb-8 text-violet-200/70">{t('builds_sub')}</p>
      <div className="grid gap-5 lg:grid-cols-2">
        {readyBuilds.map((b) => (
          <article key={b.id} className="glass rounded-3xl p-6">
            <p className="text-xs uppercase text-neon-300">{b.tag[lang]}</p>
            <h2 className="font-display text-2xl font-bold">{b.name[lang]}</h2>
            <p className="mt-1 text-neon-200">{formatSom(buildTotal(products, b.slots))}</p>
            <ul className="mt-4 space-y-1 text-sm text-violet-100/80">
              {Object.entries(b.slots).map(([cat, id]) => {
                const p = partById(products, id);
                return (
                  <li key={cat}>
                    {t(`stage_${cat}`)}: {p?.name[lang]}
                  </li>
                );
              })}
            </ul>
            <div className="mt-5 flex gap-2">
              <Link to={`/builder?preset=${b.id}`} className="rounded-xl bg-neon-600 px-4 py-2 text-sm">
                {t('apply_preset')}
              </Link>
              <button
                className="rounded-xl bg-white/5 px-4 py-2 text-sm"
                onClick={() => {
                  setBuild(b.slots);
                  addBuildToCart();
                  toast(t('toast_cart'));
                }}
              >
                {t('add_build_cart')}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
