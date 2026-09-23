import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { formatSom } from '../lib/currency';
import { useShopStore } from '../store/useShopStore';

const flow = ['new', 'confirmed', 'awaiting_payment', 'paid', 'assembling', 'shipped', 'done'] as const;

export function Track() {
  const { t } = useTranslation();
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam ?? '');
  const [query, setQuery] = useState(codeParam ?? '');
  const orders = useShopStore((s) => s.orders);
  const settings = useShopStore((s) => s.settings);
  const order = orders.find((o) => o.code.toUpperCase() === query.toUpperCase());
  const showPay = order && ['confirmed', 'awaiting_payment'].includes(order.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-4xl font-bold">{t('track_title')}</h1>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('track_ph')}
          className="flex-1 rounded-xl bg-black/30 px-4 py-3"
        />
        <button className="rounded-xl bg-neon-600 px-4" onClick={() => setQuery(code)}>
          {t('track_btn')}
        </button>
      </div>
      {query && !order && <p>{t('not_found')}</p>}
      {order && (
        <div className="glass rounded-3xl p-6">
          <p className="font-display text-2xl">{order.code}</p>
          <p className="text-neon-300">{t(`status_${order.status}`)}</p>
          <p className="mt-2 text-sm text-violet-200/70">
            {order.name} · {order.city} · {formatSom(order.total)}
          </p>
          <ol className="mt-6 space-y-2">
            {flow.map((s) => (
              <li key={s} className={flow.indexOf(s) <= flow.indexOf(order.status) ? 'text-neon-300' : 'text-white/30'}>
                {t(`status_${s}`)}
              </li>
            ))}
          </ol>
          {showPay && (
            <div className="mt-6 rounded-2xl bg-black/30 p-4 text-sm">
              <p className="mb-2 font-semibold">{t('requisites')}</p>
              <p>
                {t('card')}: {settings.card}
              </p>
              <p>
                {t('click')}: {settings.click}
              </p>
              <p>
                {t('payme')}: {settings.payme}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
