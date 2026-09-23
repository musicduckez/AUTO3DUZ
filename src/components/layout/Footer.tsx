import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl font-extrabold">
            NEXUS<span className="glow-text">PC</span>
          </p>
          <p className="mt-2 text-sm text-violet-200/70">{t('footer_copy')}</p>
        </div>
        <div className="text-sm text-violet-100/80">
          <Link to="/catalog" className="block py-1 hover:text-white">
            {t('nav_catalog')}
          </Link>
          <Link to="/builder" className="block py-1 hover:text-white">
            {t('nav_builder')}
          </Link>
          <Link to="/builds" className="block py-1 hover:text-white">
            {t('nav_builds')}
          </Link>
          <Link to="/track" className="block py-1 hover:text-white">
            {t('nav_track')}
          </Link>
        </div>
        <p className="text-sm text-violet-200/60">Telegram: @nexus_pc_uz · UZS</p>
      </div>
    </footer>
  );
}
