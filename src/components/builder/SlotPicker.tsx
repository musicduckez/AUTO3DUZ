import { useTranslation } from 'react-i18next';
import { SLOT_ORDER, partById } from '../../lib/compatibility';
import { formatSom } from '../../lib/currency';
import { useShopStore } from '../../store/useShopStore';
export function SlotPicker() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const build = useShopStore((s) => s.build);
  const setSlot = useShopStore((s) => s.setSlot);

  return (
    <div className="space-y-3">
      {SLOT_ORDER.map((cat) => {
        const selected = partById(products, build[cat]);
        const options = products.filter((p) => p.category === cat);
        return (
          <div id={`slot-${cat}`} key={cat} className="glass rounded-2xl p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{t(`stage_${cat}`)}</p>
              {selected && (
                <button className="text-xs text-rose-200" onClick={() => setSlot(cat, undefined)}>
                  {t('remove')}
                </button>
              )}
            </div>
            <select
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
              value={build[cat] ?? ''}
              onChange={(e) => setSlot(cat, e.target.value || undefined)}
            >
              <option value="">{t('choose')}</option>
              {options.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]} — {formatSom(p.price)}
                </option>
              ))}
            </select>
            {selected && <p className="mt-1 text-xs text-neon-300">{formatSom(selected.price)}</p>}
          </div>
        );
      })}
    </div>
  );
}
