import { useCallback, useEffect, useRef, useState, type ElementType } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=?!<>/\\_';

interface ScrambleTextProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** Gesamtdauer des Heilungsprozesses in ms */
  duration?: number;
  delay?: number;
  /** Erneutes Scramblen beim Hover */
  replayOnHover?: boolean;
  onComplete?: () => void;
}

interface Glyph {
  char: string;
  resolved: boolean;
}

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * „Sich heilender“ Scramble-Text: Zeichen starten als Zufallsglyphen und
 * rasten nacheinander (leicht zufällig gestaffelt) auf den echten Buchstaben ein.
 */
export function ScrambleText({
  text,
  as: Tag = 'span',
  className = '',
  duration = 1600,
  delay = 200,
  replayOnHover = true,
  onComplete,
}: ScrambleTextProps) {
  const reduced = usePrefersReducedMotion();
  const [glyphs, setGlyphs] = useState<Glyph[]>(() => [...text].map((c) => ({ char: c === ' ' ? ' ' : randomGlyph(), resolved: c === ' ' })));
  const frameRef = useRef(0);
  const runningRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const run = useCallback(
    (startDelay: number) => {
      cancelAnimationFrame(frameRef.current);
      const chars = [...text];
      if (reduced) {
        setGlyphs(chars.map((char) => ({ char, resolved: true })));
        completeRef.current?.();
        return;
      }
      runningRef.current = true;
      const revealAt = chars.map((_, i) => startDelay + (i / chars.length) * duration * 0.7 + Math.random() * duration * 0.3);
      const start = performance.now();
      let lastSwap = 0;

      const tick = (now: number) => {
        const elapsed = now - start;
        // Glyphen nur ~25x pro Sekunde wechseln – wirkt ruhiger
        if (now - lastSwap > 40) {
          lastSwap = now;
          setGlyphs(
            chars.map((char, i) =>
              char === ' ' || elapsed >= revealAt[i] ? { char, resolved: true } : { char: randomGlyph(), resolved: false },
            ),
          );
        }
        if (elapsed < startDelay + duration) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setGlyphs(chars.map((char) => ({ char, resolved: true })));
          runningRef.current = false;
          completeRef.current?.();
        }
      };
      frameRef.current = requestAnimationFrame(tick);
    },
    [text, duration, reduced],
  );

  useEffect(() => {
    run(delay);
    return () => cancelAnimationFrame(frameRef.current);
  }, [run, delay]);

  const handleHover = () => {
    if (replayOnHover && !runningRef.current) run(0);
  };

  return (
    <Tag className={className} aria-label={text} onMouseEnter={handleHover}>
      {glyphs.map((g, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`inline-block whitespace-pre transition-colors duration-300 ${g.resolved ? '' : 'text-cyan-300/70'}`}
        >
          {g.char}
        </span>
      ))}
    </Tag>
  );
}
