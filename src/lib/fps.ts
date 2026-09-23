import type { Game, GraphicsPreset, Product, Resolution } from '../types';

const RES_MUL: Record<Resolution, number> = {
  '720p': 1.45,
  '1080p': 1.0,
  '1440p': 0.68,
  '2k': 0.62,
  '4k': 0.38,
};

const SET_MUL: Record<GraphicsPreset, number> = {
  low: 1.35,
  medium: 1.0,
  high: 0.72,
  ultra: 0.52,
};

const REF = 100;

export function estimateFps(
  game: Game,
  cpu?: Product,
  gpu?: Product,
  ram?: Product,
  resolution: Resolution = '1080p',
  preset: GraphicsPreset = 'ultra',
) {
  if (!cpu?.score || !gpu?.score) return null;
  const weighted = gpu.score * game.gpuWeight + cpu.score * game.cpuWeight;
  let ramMul = 1;
  const ramGb = ram?.ramGb ?? 0;
  if (ramGb && ramGb < game.minRam) ramMul = 0.62;
  else if (ramGb >= game.minRam * 2) ramMul = 1.06;
  const vram = gpu.vram ?? 8;
  let vramMul = 1;
  if (vram < game.minVram) vramMul = 0.55;
  if (resolution === '4k' && vram < 12) vramMul *= 0.7;
  const raw =
    game.baseFps * (weighted / REF) * RES_MUL[resolution] * SET_MUL[preset] * ramMul * vramMul;
  const fps = Math.round(Math.min(400, Math.max(5, raw)));
  const tag = fps >= 60 ? 'playable' : fps >= 30 ? 'okish' : 'heavy';
  return { fps, tag };
}
