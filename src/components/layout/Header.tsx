import { Heart, Layers, Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router-dom';
import { filledCount } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';

const links = [
  { to: '/', key: 'nav_home' },
  { to: '/catalog', key: 'nav_catalog' },
  { to: '/builder', key: 'nav_builder' },
  { to: '/builds', key: 'nav_builds' },
  { to: '/track', key: 'nav_track' },
];

export function Header() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const cart = useShopStore((s) => s.cart);
  const wish = useShopStore((s) => s.wishlist);
  const compare = useShopStore((s) => s.compare);
  const build = useShopStore((s) => s.build);
  const setSearchOpen = useShopStore((s) => s.setSearchOpen);
  const setLang = useShopStore((s) => s.setLang);
  const settings = useShopStore((s) => s.settings);
  const promo = i18n.language === 'uz' ? settings.promoUz : settings.promoRu;
  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const progress = filledCount(build);

  const switchLang = (lng: 'ru' | 'uz') => {
    void i18n.changeLanguage(lng);
    setLang(lng);
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-neon-700/90 px-4 py-1.5 text-center text-xs tracking-wide">{promo || t('promo_default')}</div>
      <div className="glass border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
            NEXUS<span className="glow-text">PC</span>
          </Link>
          <nav className="hidden items-center gap-4 md:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `text-sm ${isActive ? 'text-neon-300' : 'text-violet-100/70 hover:text-white'}`
                }
              >
                {t(l.key)}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => switchLang(i18n.language === 'ru' ? 'uz' : 'ru')}
              className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase"
            >
              {i18n.language === 'uz' ? 'UZ' : 'RU'}
            </button>
            <button onClick={() => setSearchOpen(true)} className="rounded-full p-2 hover:bg-white/5" aria-label="search">
              <Search className="h-5 w-5" />
            </button>
            <Link to="/wishlist" className="relative rounded-full p-2 hover:bg-white/5">
              <Heart className="h-5 w-5" />
              {wish.length > 0 && <Dot n={wish.length} />}
            </Link>
            <Link to="/compare" className="relative rounded-full p-2 hover:bg-white/5">
              <Layers className="h-5 w-5" />
              {compare.length > 0 && <Dot n={compare.length} />}
            </Link>
            <Link to="/builder" className="hidden rounded-full border border-neon-500/40 px-3 py-1 text-xs md:block">
              {t('progress')} {progress}/9
            </Link>
            <Link to="/cart" className="relative rounded-full bg-neon-600 p-2">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && <Dot n={cartCount} />}
            </Link>
            <button className="md:hidden" onClick={() => setOpen((v) => !v)}>
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-2 px-4 pb-4 md:hidden">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 hover:bg-white/5">
                {t(l.key)}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}

function Dot({ n }: { n: number }) {
  return (
    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-pink-400 px-1 text-[10px] text-black">
      {n}
    </span>
  );
}
