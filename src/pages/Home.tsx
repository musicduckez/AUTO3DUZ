import { Box, Gamepad2, Layers3, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ui/ProductCard';
import { readyBuilds } from '../data/builds';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';
import type { Category } from '../types';

const cats: Category[] = ['cpu', 'gpu', 'mb', 'ram', 'storage', 'psu', 'case', 'cooler', 'fan'];

export function Home() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const featured = products.filter((p) => p.featured).slice(0, 4);

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-neon-500/30 bg-neon-600/10 px-3 py-1 text-xs text-neon-300">
            <Sparkles className="h-3.5 w-3.5" /> {t('hero_badge')}
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
            {t('hero_title_1')}
            <br />
            <span className="glow-text">{t('hero_title_2')}</span>
          </h1>
          <p className="mt-4 max-w-xl text-violet-100/75">{t('hero_sub')}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/builder" className="rounded-2xl bg-neon-600 px-5 py-3 font-semibold shadow-glow">
              {t('hero_cta_builder')}
            </Link>
            <Link to="/catalog" className="rounded-2xl border border-white/15 px-5 py-3">
              {t('hero_cta_catalog')}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            {[
              [String(products.length), 'hero_stat_parts'],
              ['20', 'hero_stat_games'],
              ['3', 'hero_stat_modes'],
            ].map(([n, k]) => (
              <div key={k} className="glass rounded-2xl p-3">
                <p className="font-display text-2xl font-bold text-neon-300">{n}</p>
                <p className="text-xs text-violet-200/70">{t(k)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass relative overflow-hidden rounded-[2rem] p-6">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-neon-500/30 blur-3xl" />
          <div className="grid grid-cols-3 gap-3">
            {['2D', '3D', 'ATX'].map((m) => (
              <div key={m} className="rounded-2xl bg-black/30 p-4 text-center">
                <Layers3 className="mx-auto mb-2 text-neon-300" />
                <p className="font-display font-bold">{m}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-violet-200/70">{t('how_2d_hint')}</p>
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl font-bold">{t('cats_title')}</h2>
        <p className="mb-6 text-violet-200/70">{t('cats_sub')}</p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {cats.map((c) => (
            <Link key={c} to={`/catalog/${c}`} className="glass rounded-2xl p-4 hover:border-neon-400">
              <Box className="mb-2 text-neon-300" />
              <p className="font-semibold">{t(`cat_${c}`)}</p>
              <p className="text-xs text-violet-200/60">
                {products.filter((p) => p.category === c).length} {t('items')}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">{t('featured_title')}</h2>
            <p className="text-violet-200/70">{t('featured_sub')}</p>
          </div>
          <Link to="/catalog" className="text-sm text-neon-300">
            {t('see_all')}
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-3xl font-bold">{t('builds_title')}</h2>
        <p className="mb-6 text-violet-200/70">{t('builds_sub')}</p>
        <div className="grid gap-4 md:grid-cols-2">
          {readyBuilds.map((b) => (
            <Link key={b.id} to={`/builder?preset=${b.id}`} className="glass rounded-3xl p-5 hover:shadow-glow">
              <p className="text-xs uppercase text-neon-300">{b.tag[lang]}</p>
              <h3 className="font-display text-2xl font-bold">{b.name[lang]}</h3>
              <p className="mt-2 text-neon-200">{formatSom(b.budget)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['how_1', 'how_1d'],
          ['how_2', 'how_2d'],
          ['how_3', 'how_3d'],
          ['how_4', 'how_4d'],
        ].map(([a, b], i) => (
          <div key={a} className="glass rounded-3xl p-5">
            <Gamepad2 className="mb-3 text-neon-300" />
            <p className="font-display font-bold">
              {i + 1}. {t(a)}
            </p>
            <p className="mt-2 text-sm text-violet-200/70">{t(b)}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
