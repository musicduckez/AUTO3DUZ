import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CompatPanel } from '../components/builder/CompatPanel';
import { FpsPanel } from '../components/builder/FpsPanel';
import { Schematic } from '../components/builder/Schematic';
import { SlotPicker } from '../components/builder/SlotPicker';
import { View2D } from '../components/builder/View2D';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const View3D = lazy(() => import('../components/builder/View3D').then((m) => ({ default: m.View3D })));
import { readyBuilds } from '../data/builds';
import { buildTotal, decodeBuild, encodeBuild, filledCount, randomBuild } from '../lib/compatibility';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';
import type { ViewMode } from '../types';

const colors = ['#7c3aed', '#a855f7', '#db2777', '#111827', '#f8fafc', '#0ea5e9'];

export function Builder() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [budget, setBudget] = useState(20_000_000);
  const products = useShopStore((s) => s.products);
  const build = useShopStore((s) => s.build);
  const viewMode = useShopStore((s) => s.viewMode);
  const setViewMode = useShopStore((s) => s.setViewMode);
  const setBuild = useShopStore((s) => s.setBuild);
  const clearBuild = useShopStore((s) => s.clearBuild);
  const addBuildToCart = useShopStore((s) => s.addBuildToCart);
  const setCaseColor = useShopStore((s) => s.setCaseColor);
  const toast = useShopStore((s) => s.toast);

  useEffect(() => {
    const preset = params.get('preset');
    const encoded = params.get('build');
    if (preset) {
      const found = readyBuilds.find((b) => b.id === preset);
      if (found) setBuild(found.slots);
    } else if (encoded) {
      const decoded = decodeBuild(encoded);
      if (decoded) setBuild(decoded);
    }
  }, [params, setBuild]);

  const total = buildTotal(products, build);
  const modes: ViewMode[] = ['2d', '3d', 'schematic'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">{t('builder_title')}</h1>
          <p className="text-violet-200/70">{t('builder_sub')}</p>
        </div>
        <p className="font-display text-2xl text-neon-300">{formatSom(total)}</p>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setViewMode(m)}
            className={`rounded-full px-4 py-2 text-sm ${viewMode === m ? 'bg-neon-600' : 'bg-white/5'}`}
          >
            {m === '2d' ? t('view_2d') : m === '3d' ? t('view_3d') : t('view_schema')}
          </button>
        ))}
        <span className="ml-auto rounded-full bg-white/5 px-3 py-2 text-sm">
          {t('progress')} {filledCount(build)}/9
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          {viewMode === '2d' && <View2D />}
          {viewMode === '3d' && (
            <ErrorBoundary
              fallback={<div className="grid h-[420px] place-items-center rounded-3xl bg-black text-sm text-violet-200/70">3D недоступен</div>}
            >
              <Suspense fallback={<div className="grid h-[420px] place-items-center rounded-3xl bg-black">3D…</div>}>
                <View3D />
              </Suspense>
            </ErrorBoundary>
          )}
          {viewMode === 'schematic' && <Schematic />}
          <div className="no-print mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-violet-200/70">{t('case_color')}</span>
            {colors.map((c) => (
              <button key={c} className="h-7 w-7 rounded-full border border-white/20" style={{ background: c }} onClick={() => setCaseColor(c)} />
            ))}
          </div>
        </div>
        <div className="no-print space-y-4">
          <SlotPicker />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-neon-600 px-3 py-2 text-sm"
              onClick={() => {
                addBuildToCart();
                toast(t('toast_cart'));
              }}
            >
              {t('add_build_cart')}
            </button>
            <button className="rounded-xl bg-white/5 px-3 py-2 text-sm" onClick={clearBuild}>
              {t('clear_build')}
            </button>
            <button
              className="rounded-xl bg-white/5 px-3 py-2 text-sm"
              onClick={() => {
                const url = `${location.origin}/builder?build=${encodeURIComponent(encodeBuild(build))}`;
                void navigator.clipboard.writeText(url);
                setParams({ build: encodeBuild(build) });
                toast(t('toast_copied'));
              }}
            >
              {t('share')}
            </button>
            <button className="rounded-xl bg-white/5 px-3 py-2 text-sm" onClick={() => window.print()}>
              {t('print')}
            </button>
          </div>
          <div className="glass rounded-2xl p-3">
            <label className="text-sm">{t('budget')}</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-xl bg-black/30 px-3 py-2"
            />
            <button
              className="mt-2 rounded-xl bg-fuchsia-600 px-3 py-2 text-sm"
              onClick={() => {
                setBuild(randomBuild(products, budget));
                toast(t('toast_build'));
              }}
            >
              {t('random')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CompatPanel />
        <FpsPanel />
      </div>
    </div>
  );
}
