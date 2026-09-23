import { useTranslation } from 'react-i18next';
import { buildParts } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';

export function View2D() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const slots = useShopStore((s) => s.build);
  const color = useShopStore((s) => s.caseColor);
  const parts = buildParts(products, slots);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a1030] to-black p-4">
      <svg viewBox="0 0 720 440" className="h-[400px] w-full">
        <defs>
          <linearGradient id="caseBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0b0614" />
          </linearGradient>
          <linearGradient id="glassPane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="48" y="28" width="520" height="384" rx="22" fill="url(#caseBody)" stroke="#c084fc" strokeWidth="4" />
        <rect x="72" y="52" width="340" height="336" rx="12" fill="#07040f" stroke="#a855f7" strokeWidth="2" />
        <rect x="428" y="52" width="116" height="336" rx="10" fill="#140a24" stroke="rgba(255,255,255,0.2)" />
        {parts.mb ? (
          <rect x="92" y="72" width="280" height="210" rx="10" fill="#166534" stroke="#4ade80" />
        ) : (
          <rect x="92" y="72" width="280" height="210" rx="10" fill="#14532d" opacity="0.25" stroke="#166534" strokeDasharray="6 6" />
        )}
        {parts.cpu && <rect x="178" y="118" width="78" height="78" rx="8" fill="#fbbf24" stroke="#fde68a" />}
        {parts.cooler && <circle cx="217" cy="157" r="52" fill="#67e8f9" opacity="0.45" stroke="#a5f3fc" />}
        {parts.ram && (
          <g>
            <rect x="292" y="92" width="16" height="108" rx="3" fill="#38bdf8" />
            <rect x="314" y="92" width="16" height="108" rx="3" fill="#7dd3fc" />
          </g>
        )}
        {parts.gpu && <rect x="104" y="232" width="240" height="40" rx="7" fill="#22c55e" stroke="#bbf7d0" />}
        {parts.storage && <rect x="104" y="282" width="110" height="20" rx="4" fill="#d4d4d8" />}
        {parts.psu && <rect x="104" y="318" width="180" height="52" rx="8" fill="#44403c" stroke="#a8a29e" />}
        {parts.fan && (
          <g fill="#f5d0fe">
            <circle cx="486" cy="110" r="32" />
            <circle cx="486" cy="198" r="32" />
            <circle cx="486" cy="286" r="32" />
            <circle cx="486" cy="110" r="8" fill="#1e1b4b" />
            <circle cx="486" cy="198" r="8" fill="#1e1b4b" />
            <circle cx="486" cy="286" r="8" fill="#1e1b4b" />
          </g>
        )}
        <rect x="72" y="52" width="340" height="336" rx="12" fill="url(#glassPane)" />
        <text x="580" y="70" fill="#e9d5ff" fontSize="13" fontFamily="Inter">
          {t('progress')}
        </text>
        {[
          ['case', 100],
          ['mb', 130],
          ['cpu', 160],
          ['cooler', 190],
          ['ram', 220],
          ['storage', 250],
          ['gpu', 280],
          ['psu', 310],
          ['fan', 340],
        ].map(([cat, y]) => (
          <g key={cat}>
            <circle cx="590" cy={Number(y) - 4} r="5" fill={parts[cat as keyof typeof parts] ? '#c084fc' : '#3f3f46'} />
            <text x="604" y={y} fill={parts[cat as keyof typeof parts] ? '#f5d0fe' : '#71717a'} fontSize="12" fontFamily="Inter">
              {t(`stage_${cat}`)}
            </text>
          </g>
        ))}
      </svg>
      {parts.cpu && (
        <p className="absolute bottom-3 left-5 text-xs text-violet-200/80">
          {parts.cpu.name[lang]}
          {parts.gpu ? ` · ${parts.gpu.name[lang]}` : ''}
        </p>
      )}
    </div>
  );
}
