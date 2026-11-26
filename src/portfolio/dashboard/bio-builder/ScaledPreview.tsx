import { useEffect, useRef, useState } from 'react';

/**
 * Zeigt Chaturbate-HTML verkleinert in einem abgeschotteten iframe.
 * Lädt erst, wenn die Vorschau sichtbar wird (spart Leistung in großen Galerien).
 */
export function ScaledPreview({
  html,
  renderWidth = 952,
  height,
  dark = false,
  interactive = false,
  title = 'Vorschau',
  className = '',
}: {
  html: string;
  renderWidth?: number;
  height: number;
  dark?: boolean;
  interactive?: boolean;
  title?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '300px' });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const scale = width ? width / renderWidth : 0.3;
  const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=${renderWidth}"></head><body style="margin:0;padding:18px 20px;background:${dark ? '#1b1b1f' : '#ffffff'};font-family:Arial,sans-serif;font-size:13px;overflow:${interactive ? 'auto' : 'hidden'}">${html}</body></html>`;

  return (
    <div ref={ref} className={`relative overflow-hidden ${dark ? 'bg-[#1b1b1f]' : 'bg-white'} ${className}`} style={{ height }}>
      {visible && width > 0 ? (
        <iframe
          title={title}
          sandbox=""
          srcDoc={doc}
          tabIndex={interactive ? 0 : -1}
          className={`absolute left-0 top-0 origin-top-left border-0 ${interactive ? '' : 'pointer-events-none'}`}
          style={{ width: renderWidth, height: height / scale, transform: `scale(${scale})` }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-slate-800/40" />
      )}
    </div>
  );
}
