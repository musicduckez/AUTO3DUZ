import { buildParts } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';

export function View2D() {
  const products = useShopStore((s) => s.products);
  const slots = useShopStore((s) => s.build);
  const color = useShopStore((s) => s.caseColor);
  const parts = buildParts(products, slots);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-800 to-black p-4">
      <svg viewBox="0 0 640 420" className="h-[380px] w-full">
        <defs>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="80" y="30" width="460" height="360" rx="18" fill={color} opacity="0.35" />
        <rect x="100" y="48" width="300" height="324" rx="10" fill="#12081f" stroke={color} strokeWidth="3" />
        <rect x="410" y="48" width="110" height="324" rx="8" fill="#1b0f2e" stroke="rgba(255,255,255,0.12)" />
        {parts.mb && <rect x="120" y="70" width="250" height="200" rx="8" fill="#14532d" className="part-in" />}
        {parts.cpu && <rect x="190" y="110" width="70" height="70" rx="6" fill="#fbbf24" />}
        {parts.cooler && <circle cx="225" cy="145" r="48" fill="#67e8f9" opacity="0.55" />}
        {parts.ram && (
          <g>
            <rect x="280" y="90" width="14" height="90" fill="#38bdf8" />
            <rect x="298" y="90" width="14" height="90" fill="#38bdf8" />
          </g>
        )}
        {parts.gpu && <rect x="130" y="210" width="220" height="42" rx="6" fill="#22c55e" />}
        {parts.storage && <rect x="130" y="262" width="90" height="18" rx="3" fill="#a3a3a3" />}
        {parts.psu && <rect x="130" y="300" width="160" height="50" rx="6" fill="#44403c" />}
        {parts.fan && (
          <g>
            <circle cx="465" cy="100" r="28" fill="#ddd6fe" opacity="0.7" />
            <circle cx="465" cy="180" r="28" fill="#ddd6fe" opacity="0.7" />
            <circle cx="465" cy="260" r="28" fill="#ddd6fe" opacity="0.7" />
          </g>
        )}
        <rect x="100" y="48" width="300" height="324" rx="10" fill="url(#glass)" />
      </svg>
    </div>
  );
}
