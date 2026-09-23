import { useTranslation } from 'react-i18next';
import { buildParts } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';
import type { Category } from '../../types';

const cells: { cat: Category; x: string; y: string; w: string; h: string; label: string }[] = [
  { cat: 'cpu', x: '38%', y: '28%', w: '18%', h: '16%', label: 'CPU' },
  { cat: 'cooler', x: '36%', y: '18%', w: '22%', h: '10%', label: 'COOL' },
  { cat: 'ram', x: '62%', y: '20%', w: '10%', h: '36%', label: 'DIMM' },
  { cat: 'gpu', x: '18%', y: '58%', w: '54%', h: '14%', label: 'PCIe x16' },
  { cat: 'storage', x: '18%', y: '78%', w: '24%', h: '10%', label: 'M.2' },
  { cat: 'psu', x: '70%', y: '78%', w: '20%', h: '12%', label: '24-pin' },
];

export function Schematic() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const slots = useShopStore((s) => s.build);
  const parts = buildParts(products, slots);
  const setSlot = useShopStore((s) => s.setSlot);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-3xl bg-[#07130c] p-4">
      <div className="absolute inset-6 rounded-2xl border-2 border-emerald-700/70 bg-gradient-to-br from-emerald-950 to-green-950">
        <div className="absolute left-[8%] top-[10%] text-[10px] uppercase tracking-[0.3em] text-emerald-400/70">
          ATX · {parts.mb ? parts.mb.name[lang] : t('stage_mb')}
        </div>
        <div className="absolute right-[8%] bottom-[18%] h-16 w-16 rounded-full border border-emerald-600/40 bg-emerald-900/40" />
        {cells.map((c) => {
          const filled = Boolean(parts[c.cat]);
          return (
            <button
              key={c.cat}
              onClick={() => document.getElementById(`slot-${c.cat}`)?.scrollIntoView({ behavior: 'smooth' })}
              className={`absolute flex flex-col items-center justify-center rounded-md border text-[10px] uppercase tracking-wider ${
                filled
                  ? 'border-fuchsia-300 bg-fuchsia-500/30 text-white'
                  : 'border-dashed border-emerald-400/50 bg-emerald-900/20 text-emerald-200/80'
              }`}
              style={{ left: c.x, top: c.y, width: c.w, height: c.h }}
            >
              <span>{c.label}</span>
              {filled && <span className="mt-1 max-w-[90%] truncate text-[9px] normal-case">{parts[c.cat]?.name[lang]}</span>}
            </button>
          );
        })}
        {!parts.mb && (
          <button
            className="absolute inset-0 grid place-items-center text-emerald-200/60"
            onClick={() => setSlot('mb', undefined)}
          >
            {t('stage_mb')}
          </button>
        )}
      </div>
    </div>
  );
}
