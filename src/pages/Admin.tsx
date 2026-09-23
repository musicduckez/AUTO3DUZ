import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { seedProducts } from '../data/products';
import { formatSom } from '../lib/currency';
import { sendTelegram } from '../lib/telegram';
import { useShopStore } from '../store/useShopStore';
import type { Category, Game, Localized, Order, OrderStatus, Product } from '../types';

const tabs = ['orders', 'products', 'games', 'pay', 'promo'] as const;
const statuses: OrderStatus[] = [
  'new',
  'confirmed',
  'awaiting_payment',
  'paid',
  'assembling',
  'shipped',
  'done',
];

const statusColors: Record<OrderStatus, string> = {
  new: 'bg-slate-600',
  confirmed: 'bg-sky-600',
  awaiting_payment: 'bg-amber-600',
  paid: 'bg-emerald-600',
  assembling: 'bg-violet-600',
  shipped: 'bg-indigo-600',
  done: 'bg-fuchsia-700',
};

export function Admin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const authed = useShopStore((s) => s.adminAuthed);
  const tryLogin = useShopStore((s) => s.tryLogin);
  const logoutAdmin = useShopStore((s) => s.logoutAdmin);
  const changePassword = useShopStore((s) => s.changePassword);
  const lockUntil = useShopStore((s) => s.lockUntil);
  const [pass, setPass] = useState('');
  const [tab, setTab] = useState<(typeof tabs)[number]>('orders');
  const [msg, setMsg] = useState('');

  if (!authed) {
    const locked = Date.now() < lockUntil;
    return (
      <form
        className="glass mx-auto max-w-sm space-y-4 rounded-3xl p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await tryLogin(pass);
          setMsg(res === 'ok' ? '' : res === 'lock' || locked ? t('locked') : t('toast_err'));
        }}
      >
        <h1 className="font-display text-2xl font-bold">{t('admin_login')}</h1>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          placeholder={t('password')}
          className="w-full rounded-xl bg-black/30 px-4 py-3"
        />
        {msg && <p className="text-sm text-rose-300">{msg}</p>}
        <button disabled={locked} className="w-full rounded-xl bg-neon-600 py-3">
          {t('login')}
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`rounded-full px-4 py-2 text-sm ${tab === tb ? 'bg-neon-600' : 'bg-white/5'}`}
          >
            {t(tb === 'products' ? 'tab_products' : tb === 'games' ? 'tab_games' : tb === 'orders' ? 'tab_orders' : tb === 'pay' ? 'tab_pay' : 'tab_promo')}
          </button>
        ))}
        <button className="ml-auto text-sm text-rose-200" onClick={logoutAdmin}>
          {t('logout')}
        </button>
      </div>
      {tab === 'products' && <ProductsAdmin lang={lang} />}
      {tab === 'games' && <GamesAdmin />}
      {tab === 'orders' && <OrdersAdmin />}
      {tab === 'pay' && <PayAdmin />}
      {tab === 'promo' && (
        <div className="glass space-y-3 rounded-3xl p-5">
          <PromoAdmin />
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const np = String(fd.get('np') || '');
              if (np.length >= 6) await changePassword(np);
            }}
          >
            <input name="np" placeholder={t('new_pass')} className="flex-1 rounded-xl bg-black/30 px-3 py-2" />
            <button className="rounded-xl bg-white/10 px-3">{t('change_pass')}</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ProductsAdmin({ lang }: { lang: 'ru' | 'uz' }) {
  const { t } = useTranslation();
  const products = useShopStore((s) => s.products);
  const saveProducts = useShopStore((s) => s.saveProducts);

  return (
    <div className="space-y-4">
      <form
        className="glass grid gap-2 rounded-2xl p-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get('name') || '');
          const product: Product = {
            id: `custom-${Date.now()}`,
            category: String(fd.get('cat')) as Category,
            brand: String(fd.get('brand') || 'NEXUS'),
            name: { ru: name, uz: name },
            price: Number(fd.get('price') || 0),
            stock: Number(fd.get('stock') || 1),
            rating: 4.5,
            hue: Math.floor(Math.random() * 360),
            score: Number(fd.get('score') || 50),
            wattDraw: Number(fd.get('watt') || 50),
            socket: String(fd.get('socket') || '') || undefined,
            specs: { note: 'custom' },
          };
          saveProducts([product, ...products]);
          e.currentTarget.reset();
        }}
      >
        <input name="name" required placeholder={t('name')} className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="brand" placeholder={t('brand_label')} className="rounded-lg bg-black/30 px-3 py-2" />
        <select name="cat" className="rounded-lg bg-black/30 px-3 py-2">
          {(['cpu', 'gpu', 'mb', 'ram', 'storage', 'psu', 'case', 'cooler', 'fan'] as Category[]).map((c) => (
            <option key={c} value={c}>
              {t(`cat_${c}`)}
            </option>
          ))}
        </select>
        <input name="price" type="number" placeholder={t('price')} className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="stock" type="number" placeholder={t('stock')} className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="score" type="number" placeholder="score" className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="watt" type="number" placeholder="W" className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="socket" placeholder="socket" className="rounded-lg bg-black/30 px-3 py-2" />
        <button className="rounded-lg bg-neon-600 py-2">{t('add')}</button>
      </form>
      <div className="max-h-[480px] space-y-2 overflow-auto">
        {products.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
            <span>
              {p.name[lang]} · {formatSom(p.price)}
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                defaultValue={p.price}
                className="w-32 rounded bg-black/30 px-2 py-1"
                onBlur={(e) => saveProducts(products.map((x) => (x.id === p.id ? { ...x, price: Number(e.target.value) } : x)))}
              />
              <button
                className="text-rose-200"
                onClick={() => saveProducts(products.filter((x) => x.id !== p.id).length ? products.filter((x) => x.id !== p.id) : seedProducts)}
              >
                {t('delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GamesAdmin() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const games = useShopStore((s) => s.games);
  const saveGames = useShopStore((s) => s.saveGames);

  return (
    <div className="space-y-4">
      <form
        className="glass grid gap-2 rounded-2xl p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get('name') || 'Game');
          const loc: Localized = { ru: name, uz: name };
          const game: Game = {
            id: `g-${Date.now()}`,
            name: loc,
            year: Number(fd.get('year') || 2025),
            gpuWeight: Number(fd.get('gpu') || 0.75),
            cpuWeight: Number(fd.get('cpu') || 0.25),
            baseFps: Number(fd.get('base') || 60),
            minRam: 16,
            minVram: 8,
            custom: true,
          };
          saveGames([game, ...games]);
          e.currentTarget.reset();
        }}
      >
        <input name="name" required placeholder={t('fps_custom')} className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="year" type="number" placeholder={t('year')} className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="base" type="number" placeholder="base FPS" className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="gpu" type="number" step="0.05" placeholder="GPU w" className="rounded-lg bg-black/30 px-3 py-2" />
        <input name="cpu" type="number" step="0.05" placeholder="CPU w" className="rounded-lg bg-black/30 px-3 py-2" />
        <button className="rounded-lg bg-neon-600 py-2">{t('add')}</button>
      </form>
      {games.map((g) => (
        <div key={g.id} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">
          <span>
            {g.name[lang]} · {g.year}
          </span>
          <button className="text-rose-200" onClick={() => saveGames(games.filter((x) => x.id !== g.id))}>
            {t('delete')}
          </button>
        </div>
      ))}
    </div>
  );
}

function OrdersAdmin() {
  const { t, i18n } = useTranslation();
  const orders = useShopStore((s) => s.orders);
  const settings = useShopStore((s) => s.settings);
  const setOrderStatus = useShopStore((s) => s.setOrderStatus);
  const toast = useShopStore((s) => s.toast);
  const [busyId, setBusyId] = useState<string | null>(null);

  const changeStatus = async (order: Order, status: OrderStatus) => {
    if (order.status === status) return;
    setBusyId(order.id);
    setOrderStatus(order.id, status);
    const text = [
      `📦 NEXUS PC · ${order.code}`,
      `Статус: ${t(`status_${status}`)}`,
      `${order.name} · ${order.phone}`,
      `Σ ${formatSom(order.total)}`,
    ].join('\n');
    const result = await sendTelegram(settings, text);
    setBusyId(null);
    toast(t('status_changed'));
    if (result.status === 'bot') toast(t('notify_client'), 'info');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-violet-200/70">{t('quick_status')}</p>
      {!orders.length && <p>{t('empty')}</p>}
      {orders.map((o) => (
        <div key={o.id} className="glass rounded-2xl p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg">{o.code}</p>
              <p className="text-sm text-violet-200/70">
                {o.name} · {o.phone} · {o.telegram}
              </p>
              <p className="text-sm">{formatSom(o.total)}</p>
              {o.receiptUploadedAt && (
                <p className="mt-1 text-xs text-emerald-300">
                  {t('receipt_uploaded')} · {new Date(o.receiptUploadedAt).toLocaleString(i18n.language)}
                </p>
              )}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${statusColors[o.status]}`}>
              {t(`status_${o.status}`)}
            </span>
          </div>

          <p className="mb-2 text-xs uppercase tracking-wide text-violet-200/50">{t('status_label')}</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                disabled={busyId === o.id}
                onClick={() => void changeStatus(o, s)}
                className={`rounded-xl px-3 py-2 text-xs font-medium transition ${
                  o.status === s
                    ? `${statusColors[s]} text-white ring-2 ring-white/40`
                    : 'bg-white/5 text-violet-100 hover:bg-white/10'
                } disabled:opacity-50`}
              >
                {t(`status_${s}`)}
              </button>
            ))}
          </div>

          {o.receiptDataUrl && o.status === 'awaiting_payment' && (
            <button
              type="button"
              className="mt-3 rounded-xl bg-emerald-600 px-3 py-2 text-sm"
              onClick={() => void changeStatus(o, 'paid')}
            >
              {t('confirm_payment')}
            </button>
          )}

          {o.receiptDataUrl?.startsWith('data:image') && (
            <img src={o.receiptDataUrl} alt="receipt" className="mt-3 max-h-40 rounded-xl object-contain" />
          )}
          {o.receiptNote && <p className="mt-2 text-sm text-violet-200/70">{o.receiptNote}</p>}
        </div>
      ))}
    </div>
  );
}

function PayAdmin() {
  const { t } = useTranslation();
  const settings = useShopStore((s) => s.settings);
  const saveSettings = useShopStore((s) => s.saveSettings);
  return (
    <form
      className="glass grid gap-3 rounded-3xl p-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        saveSettings({
          telegramUser: String(fd.get('user') || ''),
          botToken: String(fd.get('token') || ''),
          chatId: String(fd.get('chat') || ''),
          card: String(fd.get('card') || ''),
          cardHolder: String(fd.get('holder') || ''),
          cardBank: String(fd.get('bank') || ''),
          click: String(fd.get('click') || ''),
          payme: String(fd.get('payme') || ''),
        });
      }}
    >
      <input name="user" defaultValue={settings.telegramUser} placeholder={t('tg_user')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="token" defaultValue={settings.botToken} placeholder={t('bot_token')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="chat" defaultValue={settings.chatId} placeholder={t('chat_id')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="card" defaultValue={settings.card} placeholder={t('card')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="holder" defaultValue={settings.cardHolder} placeholder={t('card_holder')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="bank" defaultValue={settings.cardBank} placeholder={t('card_bank')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="click" defaultValue={settings.click} placeholder={t('click')} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="payme" defaultValue={settings.payme} placeholder={t('payme')} className="rounded-xl bg-black/30 px-3 py-2" />
      <button className="rounded-xl bg-neon-600 py-2">{t('save')}</button>
    </form>
  );
}

function PromoAdmin() {
  const { t } = useTranslation();
  const settings = useShopStore((s) => s.settings);
  const saveSettings = useShopStore((s) => s.saveSettings);
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        saveSettings({
          promoRu: String(fd.get('ru') || ''),
          promoUz: String(fd.get('uz') || ''),
        });
      }}
    >
      <input name="ru" defaultValue={settings.promoRu} className="rounded-xl bg-black/30 px-3 py-2" />
      <input name="uz" defaultValue={settings.promoUz} className="rounded-xl bg-black/30 px-3 py-2" />
      <button className="rounded-xl bg-neon-600 py-2">{t('save')}</button>
    </form>
  );
}
