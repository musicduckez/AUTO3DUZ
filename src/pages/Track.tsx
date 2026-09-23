import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { formatSom } from '../lib/currency';
import { paymentCaption, sendTelegramPhoto } from '../lib/telegram';
import { useShopStore } from '../store/useShopStore';

const flow = ['new', 'confirmed', 'awaiting_payment', 'paid', 'assembling', 'shipped', 'done'] as const;

function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<{ dataUrl: string; fileName: string }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: String(reader.result), fileName: file.name });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('canvas'));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        fileName: file.name.replace(/\.\w+$/, '') + '.jpg',
      });
    };
    img.onerror = () => reject(new Error('image load'));
    img.src = url;
  });
}

export function Track() {
  const { t } = useTranslation();
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam ?? '');
  const [query, setQuery] = useState(codeParam ?? '');
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const orders = useShopStore((s) => s.orders);
  const settings = useShopStore((s) => s.settings);
  const attachReceipt = useShopStore((s) => s.attachReceipt);
  const loadOrderByCode = useShopStore((s) => s.loadOrderByCode);
  const toast = useShopStore((s) => s.toast);
  const order = orders.find((o) => o.code.toUpperCase() === query.toUpperCase());
  const canPay = order && ['new', 'confirmed', 'awaiting_payment'].includes(order.status);

  useEffect(() => {
    if (codeParam) {
      setCode(codeParam);
      setQuery(codeParam);
    }
  }, [codeParam]);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    void loadOrderByCode(query).finally(() => setLoading(false));
  }, [query, loadOrderByCode]);

  const copyCard = async () => {
    try {
      await navigator.clipboard.writeText(settings.card.replace(/\s/g, ''));
      setCopied(true);
      toast(t('copied_card'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t('toast_err'), 'err');
    }
  };

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
      {query && loading && <p>…</p>}
      {query && !loading && !order && <p>{t('not_found')}</p>}
      {order && (
        <div className="glass space-y-5 rounded-3xl p-6">
          <div>
            <p className="font-display text-2xl">{order.code}</p>
            <p className="text-neon-300">{t(`status_${order.status}`)}</p>
            <p className="mt-2 text-sm text-violet-200/70">
              {order.name} · {order.city} · {formatSom(order.total)}
            </p>
          </div>

          <ol className="space-y-2">
            {flow.map((s) => (
              <li key={s} className={flow.indexOf(s) <= flow.indexOf(order.status) ? 'text-neon-300' : 'text-white/30'}>
                {t(`status_${s}`)}
              </li>
            ))}
          </ol>

          {canPay && (
            <div className="rounded-2xl border border-neon-500/30 bg-black/40 p-4">
              <p className="mb-1 font-display text-lg font-bold">{t('pay_title')}</p>
              <p className="mb-4 text-sm text-violet-200/70">{t('pay_hint')}</p>

              <div className="mb-3 rounded-xl bg-neon-600/10 p-3">
                <p className="text-xs uppercase tracking-wide text-violet-200/60">{t('pay_amount')}</p>
                <p className="font-display text-2xl font-bold text-neon-300">{formatSom(order.total)}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                  <div>
                    <p className="text-xs text-violet-200/60">{t('card')}</p>
                    <p className="font-display text-lg tracking-wide">{settings.card}</p>
                    <p className="text-xs text-violet-200/70">
                      {settings.cardHolder} · {settings.cardBank}
                    </p>
                  </div>
                  <button type="button" onClick={() => void copyCard()} className="rounded-xl bg-neon-600 px-3 py-2 text-xs font-semibold">
                    {copied ? t('copied_card') : t('copy_card')}
                  </button>
                </div>
                <p>
                  {t('click')}: {settings.click}
                </p>
                <p>
                  {t('payme')}: {settings.payme}
                </p>
              </div>

              <div className="mt-5 border-t border-white/10 pt-4">
                <p className="mb-2 font-semibold">{t('receipt_title')}</p>
                <p className="mb-3 text-sm text-violet-200/70">{t('receipt_hint')}</p>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="mb-3 block w-full text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    void compressImage(file)
                      .then((r) => {
                        setPreview(r.dataUrl);
                        setFileName(r.fileName);
                        setMsg('');
                      })
                      .catch(() => toast(t('toast_err'), 'err'));
                  }}
                />
                {preview && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-white/10">
                    {preview.startsWith('data:image') ? (
                      <img src={preview} alt="receipt" className="max-h-64 w-full object-contain bg-black/40" />
                    ) : (
                      <p className="p-3 text-sm">{fileName}</p>
                    )}
                  </div>
                )}
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t('receipt_note')}
                  className="mb-3 w-full rounded-xl bg-black/30 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!preview || busy}
                  className="w-full rounded-2xl bg-neon-600 py-3 font-semibold disabled:opacity-50"
                  onClick={() => {
                    if (!preview) return;
                    void (async () => {
                      setBusy(true);
                      const result = await attachReceipt(order.code, {
                        dataUrl: preview,
                        fileName: fileName || 'receipt.jpg',
                        note,
                        sendTelegram: true,
                      });
                      if (!result.order) {
                        setBusy(false);
                        toast(t('not_found'), 'err');
                        return;
                      }
                      let tg = result.telegram;
                      if (!tg || tg.status !== 'bot') {
                        tg = await sendTelegramPhoto(settings, {
                          dataUrl: preview,
                          fileName: fileName || 'receipt.jpg',
                          caption: paymentCaption(result.order, note),
                        });
                      }
                      setBusy(false);
                      if (tg.status === 'bot') {
                        setMsg(t('receipt_sent'));
                        toast(t('receipt_sent'));
                        setPreview(null);
                        setNote('');
                      } else {
                        setMsg(tg.detail || t('receipt_fail'));
                        toast(tg.detail || t('receipt_fail'), 'err');
                      }
                    })();
                  }}
                >
                  {busy ? '…' : t('receipt_send')}
                </button>
                {msg && <p className="mt-2 text-sm text-neon-300">{msg}</p>}
              </div>
            </div>
          )}

          {order.receiptDataUrl && (
            <div className="rounded-2xl bg-black/30 p-4">
              <p className="mb-2 font-semibold">{t('receipt_uploaded')}</p>
              {order.receiptDataUrl.startsWith('data:image') ? (
                <img src={order.receiptDataUrl} alt="receipt" className="max-h-48 rounded-xl object-contain" />
              ) : (
                <p className="text-sm">{order.receiptFileName}</p>
              )}
              {order.receiptUploadedAt && (
                <p className="mt-2 text-xs text-violet-200/60">{new Date(order.receiptUploadedAt).toLocaleString()}</p>
              )}
            </div>
          )}

          {order.status === 'paid' && <p className="text-emerald-300">{t('pay_confirmed')}</p>}
        </div>
      )}
    </div>
  );
}
