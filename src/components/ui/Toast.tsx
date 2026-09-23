import { useShopStore } from '../../store/useShopStore';

export function Toasts() {
  const toasts = useShopStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-2xl px-4 py-3 text-sm shadow-glow ${
            t.kind === 'err' ? 'bg-rose-700/90' : t.kind === 'info' ? 'bg-indigo-700/90' : 'bg-violet-700/90'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}
