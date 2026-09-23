import type { BuildSlots, Category, Product } from '../types';

export const SLOT_ORDER: Category[] = [
  'case',
  'mb',
  'cpu',
  'cooler',
  'ram',
  'storage',
  'gpu',
  'psu',
  'fan',
];

export function partById(products: Product[], id?: string) {
  if (!id) return undefined;
  return products.find((p) => p.id === id);
}

export function buildParts(products: Product[], slots: BuildSlots) {
  const map: Partial<Record<Category, Product>> = {};
  for (const cat of SLOT_ORDER) {
    const p = partById(products, slots[cat]);
    if (p) map[cat] = p;
  }
  return map;
}

export function buildTotal(products: Product[], slots: BuildSlots) {
  return SLOT_ORDER.reduce((sum, cat) => {
    const p = partById(products, slots[cat]);
    return sum + (p?.price ?? 0);
  }, 0);
}

export function wattDraw(products: Product[], slots: BuildSlots) {
  return SLOT_ORDER.reduce((sum, cat) => {
    const p = partById(products, slots[cat]);
    return sum + (p?.wattDraw ?? 0);
  }, 40);
}

export interface CompatIssue {
  key: string;
  level: 'warn' | 'err';
}

export function compatibility(products: Product[], slots: BuildSlots): CompatIssue[] {
  const parts = buildParts(products, slots);
  const issues: CompatIssue[] = [];
  if (parts.cpu && parts.mb && parts.cpu.socket && parts.mb.socket && parts.cpu.socket !== parts.mb.socket) {
    issues.push({ key: 'issue_socket', level: 'err' });
  }
  if (parts.ram && parts.mb && parts.ram.ramType && parts.mb.ramType && parts.ram.ramType !== parts.mb.ramType) {
    issues.push({ key: 'issue_ram', level: 'err' });
  }
  if (parts.gpu && parts.case && parts.gpu.gpuLength && parts.case.caseMaxGpu && parts.gpu.gpuLength > parts.case.caseMaxGpu) {
    issues.push({ key: 'issue_gpu_len', level: 'err' });
  }
  if (parts.cooler && parts.case && parts.cooler.coolerHeight && parts.case.caseMaxCooler && parts.cooler.coolerHeight > parts.case.caseMaxCooler) {
    issues.push({ key: 'issue_cooler', level: 'warn' });
  }
  if (parts.cooler && parts.cpu && parts.cooler.socket && parts.cpu.socket && !parts.cooler.socket.split(',').includes(parts.cpu.socket)) {
    issues.push({ key: 'issue_cooler_sock', level: 'err' });
  }
  return issues;
}

export function bottleneck(products: Product[], slots: BuildSlots) {
  const cpu = partById(products, slots.cpu);
  const gpu = partById(products, slots.gpu);
  if (!cpu?.score || !gpu?.score) return null;
  const ratio = cpu.score / gpu.score;
  if (ratio < 0.78) return { key: 'cpu_bound' as const, value: Math.round((1 - ratio) * 100) };
  if (ratio > 1.22) return { key: 'gpu_bound' as const, value: Math.round((ratio - 1) * 100) };
  return { key: 'balanced' as const, value: 0 };
}

export function filledCount(slots: BuildSlots) {
  return SLOT_ORDER.filter((c) => Boolean(slots[c])).length;
}

export function encodeBuild(slots: BuildSlots) {
  return btoa(JSON.stringify(slots));
}

export function decodeBuild(raw: string | null): BuildSlots | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(raw)) as BuildSlots;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function randomBuild(products: Product[], budget: number): BuildSlots {
  const pick = (cat: Category, pred: (p: Product) => boolean) => {
    const list = products.filter((p) => p.category === cat && pred(p)).sort((a, b) => a.price - b.price);
    if (!list.length) return undefined;
    const affordable = list.filter((p) => p.price < budget * 0.45);
    const pool = affordable.length ? affordable : list.slice(0, 3);
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const cpu = pick('cpu', () => true);
  const mb = pick('mb', (p) => !cpu?.socket || p.socket === cpu.socket);
  const ram = pick('ram', (p) => !mb?.ramType || p.ramType === mb.ramType);
  const gpu = pick('gpu', () => true);
  const psuNeed = (cpu?.wattDraw ?? 80) + (gpu?.wattDraw ?? 200) + 120;
  const psu = pick('psu', (p) => (p.wattage ?? 0) >= psuNeed);
  const pcCase = pick('case', (p) => !gpu?.gpuLength || (p.caseMaxGpu ?? 999) >= gpu.gpuLength);
  const cooler = pick('cooler', (p) => !cpu?.socket || Boolean(p.socket?.split(',').includes(cpu.socket!)));
  const storage = pick('storage', () => true);
  const fan = pick('fan', () => true);

  const slots: BuildSlots = {};
  if (pcCase) slots.case = pcCase.id;
  if (mb) slots.mb = mb.id;
  if (cpu) slots.cpu = cpu.id;
  if (cooler) slots.cooler = cooler.id;
  if (ram) slots.ram = ram.id;
  if (storage) slots.storage = storage.id;
  if (gpu) slots.gpu = gpu.id;
  if (psu) slots.psu = psu.id;
  if (fan) slots.fan = fan.id;

  let total = buildTotal(products, slots);
  if (total > budget && slots.gpu) {
    const cheaper = products
      .filter((p) => p.category === 'gpu' && p.price < (partById(products, slots.gpu)?.price ?? 0))
      .sort((a, b) => b.score! - a.score!);
    if (cheaper[0]) slots.gpu = cheaper[0].id;
  }
  return slots;
}
