import { useTranslation } from 'react-i18next';
import { bottleneck, compatibility, wattDraw, partById } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';

export function CompatPanel() {
  const { t } = useTranslation();
  const products = useShopStore((s) => s.products);
  const build = useShopStore((s) => s.build);
  const issues = compatibility(products, build);
  const bn = bottleneck(products, build);
  const need = wattDraw(products, build);
  const psu = partById(products, build.psu);
  const have = psu?.wattage ?? 0;

  return (
    <div className="glass space-y-3 rounded-3xl p-5">
      <h3 className="font-display font-bold">{t('compat')}</h3>
      {issues.length === 0 ? (
        <p className="text-sm text-emerald-300">{t('no_issues')}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {issues.map((i) => (
            <li key={i.key} className={i.level === 'err' ? 'text-rose-300' : 'text-amber-300'}>
              {t(i.key)}
            </li>
          ))}
        </ul>
      )}
      <div>
        <p className="text-sm text-violet-200/80">
          {t('watt_need')}: {need} W · {t('watt_have')}: {have || '—'} W
        </p>
        <p className={`text-sm ${have >= need * 1.15 ? 'text-emerald-300' : have ? 'text-amber-300' : 'text-violet-200/60'}`}>
          {have ? (have >= need * 1.15 ? t('watt_ok') : t('watt_low')) : t('wattage')}
        </p>
      </div>
      {bn && (
        <p className="text-sm">
          {t('bottleneck')}: {t(bn.key)}
          {bn.value ? ` · ${bn.value}%` : ''}
        </p>
      )}
    </div>
  );
}
