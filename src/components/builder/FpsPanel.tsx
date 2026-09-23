import { useTranslation } from 'react-i18next';
import { estimateFps } from '../../lib/fps';
import { partById } from '../../lib/compatibility';
import { useShopStore } from '../../store/useShopStore';
import type { GraphicsPreset, Resolution } from '../../types';

const presets: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra'];
const resolutions: Resolution[] = ['720p', '1080p', '1440p', '2k', '4k'];

export function FpsPanel() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const games = useShopStore((s) => s.games);
  const products = useShopStore((s) => s.products);
  const build = useShopStore((s) => s.build);
  const fpsPreset = useShopStore((s) => s.fpsPreset);
  const fpsRes = useShopStore((s) => s.fpsRes);
  const setFps = useShopStore((s) => s.setFps);
  const cpu = partById(products, build.cpu);
  const gpu = partById(products, build.gpu);
  const ram = partById(products, build.ram);

  return (
    <section className="glass rounded-3xl p-5">
      <h3 className="font-display text-xl font-bold">{t('fps_title')}</h3>
      <p className="mb-4 text-sm text-violet-200/70">{t('fps_sub')}</p>
      <div className="mb-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            onClick={() => setFps(p, fpsRes)}
            className={`rounded-full px-3 py-1 text-xs ${fpsPreset === p ? 'bg-neon-600' : 'bg-white/5'}`}
          >
            {t(p)}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {resolutions.map((r) => (
          <button
            key={r}
            onClick={() => setFps(fpsPreset, r)}
            className={`rounded-full px-3 py-1 text-xs uppercase ${fpsRes === r ? 'bg-fuchsia-600' : 'bg-white/5'}`}
          >
            {r}
          </button>
        ))}
      </div>
      {!cpu || !gpu ? (
        <p className="text-sm text-violet-200/70">{t('fps_need_parts')}</p>
      ) : (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-violet-300/70">
              <tr>
                <th className="pb-2">{t('game')}</th>
                <th>{t('fps')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const r = estimateFps(g, cpu, gpu, ram, fpsRes, fpsPreset);
                if (!r) return null;
                const color =
                  r.tag === 'playable' ? 'text-emerald-300' : r.tag === 'okish' ? 'text-amber-300' : 'text-rose-300';
                return (
                  <tr key={g.id} className="border-t border-white/5">
                    <td className="py-2">{g.name[lang]}</td>
                    <td className={`font-display font-bold ${color}`}>{r.fps}</td>
                    <td className={`text-xs ${color}`}>{t(r.tag)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
