import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { cities } from '../data/cities';
import { formatSom } from '../lib/currency';
import { orderMessage, sendTelegram } from '../lib/telegram';
import { useShopStore } from '../store/useShopStore';

export function Checkout() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'uz' ? 'uz' : 'ru';
  const products = useShopStore((s) => s.products);
  const cart = useShopStore((s) => s.cart);
  const placeOrder = useShopStore((s) => s.placeOrder);
  const clearCart = useShopStore((s) => s.clearCart);
  const toast = useShopStore((s) => s.toast);
  const [cityId, setCityId] = useState(cities[0].id);
  const [done, setDone] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [tgStatus, setTgStatus] = useState<string>('');
  const city = cities.find((c) => c.id === cityId) ?? cities[0];
  const subtotal = cart.reduce((s, i) => s + (products.find((p) => p.id === i.productId)?.price ?? 0) * i.qty, 0);
  const total = subtotal + city.fee;

  if (done) {
    return (
      <div className="glass mx-auto max-w-lg rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl font-bold">{t('order_ok')}</h1>
        <p className="mt-2 text-violet-200/70">{t('order_code')}</p>
        <p className="font-display text-4xl text-neon-300">{done}</p>
        <p className="mt-3 text-sm">{t('track_hint')}</p>
        {tgStatus && <p className="mt-3 text-sm text-neon-300">{tgStatus}</p>}
        <Link to={`/track/${done}`} className="mt-6 inline-block rounded-2xl bg-neon-600 px-5 py-3">
          {t('nav_track')}
        </Link>
      </div>
    );
  }

  if (!cart.length) {
    return (
      <p>
        {t('empty_cart')}{' '}
        <Link to="/catalog" className="text-neon-300">
          {t('continue')}
        </Link>
      </p>
    );
  }

  return (
    <form
      className="mx-auto grid max-w-3xl gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void (async () => {
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get('name') || '').trim();
          const phone = String(fd.get('phone') || '').trim();
          const telegram = String(fd.get('telegram') || '').trim();
          const address = String(fd.get('address') || '').trim();
          if (!name || !phone || !telegram || !address) {
            toast(t('toast_err'), 'err');
            return;
          }
          setSending(true);
          const order = placeOrder({
            name,
            phone,
            telegram,
            city: city.name[lang],
            address,
            comment: String(fd.get('comment') || ''),
            delivery: city.fee,
            total,
          });
          const text = orderMessage(order, products, lang);
          const live = useShopStore.getState().settings;
          const result = await sendTelegram(live, text);
          clearCart();
          if (result.status === 'bot') {
            toast(`${t('toast_order')} → Telegram`);
            setTgStatus('Отправлено в Telegram ✅');
          } else if (result.status === 'share') {
            toast(t('toast_order'), 'info');
            setTgStatus('Открыт Telegram share (бот не настроен)');
          } else if (result.status === 'missing') {
            toast('Telegram не настроен: нет chat_id', 'err');
            setTgStatus('Ошибка: нет chat_id');
          } else {
            toast(`Telegram: ${result.detail || 'ошибка'}`, 'err');
            setTgStatus(`Ошибка: ${result.detail || 'не удалось отправить'}`);
          }
          setDone(order.code);
          setSending(false);
        })();
      }}
    >
      <h1 className="font-display text-4xl font-bold">{t('checkout_title')}</h1>
      <input name="name" required placeholder={t('name')} className="rounded-xl bg-black/30 px-4 py-3" />
      <input name="phone" required placeholder={t('phone')} className="rounded-xl bg-black/30 px-4 py-3" />
      <input name="telegram" required placeholder="@username" className="rounded-xl bg-black/30 px-4 py-3" />
      <select value={cityId} onChange={(e) => setCityId(e.target.value)} className="rounded-xl bg-black/30 px-4 py-3">
        {cities.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name[lang]} · {c.days} {t('days')} · {formatSom(c.fee)}
          </option>
        ))}
      </select>
      <input name="address" required placeholder={t('address')} className="rounded-xl bg-black/30 px-4 py-3" />
      <textarea name="comment" placeholder={t('comment')} className="rounded-xl bg-black/30 px-4 py-3" />
      <div className="glass rounded-2xl p-4">
        <p>
          {t('subtotal')}: {formatSom(subtotal)}
        </p>
        <p>
          {t('delivery')}: {formatSom(city.fee)}
        </p>
        <p className="font-display text-2xl text-neon-300">
          {t('total')}: {formatSom(total)}
        </p>
      </div>
      <button disabled={sending} className="rounded-2xl bg-neon-600 py-3 font-semibold disabled:opacity-60">
        {sending ? '…' : t('pay_tg')}
      </button>
    </form>
  );
}
