import { useEffect, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface TypewriterProps {
  text: string;
  /** ms pro Zeichen */
  speed?: number;
  startDelay?: number;
  /** Startet erst, wenn `start` true ist (z. B. nach der Scramble-Headline) */
  start?: boolean;
  className?: string;
}

/** Tippt den Text Zeichen für Zeichen mit natürlich variierendem Tempo. */
export function Typewriter({ text, speed = 32, startDelay = 150, start = true, className = '' }: TypewriterProps) {
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = useState(0);
  const done = count >= text.length;

  useEffect(() => {
    if (!start) return;
    if (reduced) {
      setCount(text.length);
      return;
    }
    let timeout: ReturnType<typeof setTimeout>;
    let i = 0;
    const step = () => {
      i += 1;
      setCount(i);
      if (i < text.length) {
        const ch = text[i - 1];
        const pause = /[.,–!?]/.test(ch) ? speed * 8 : speed * (0.6 + Math.random() * 0.8);
        timeout = setTimeout(step, pause);
      }
    };
    timeout = setTimeout(step, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay, start, reduced]);

  return (
    <p className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.slice(0, count)}
        <span
          className={`ml-0.5 inline-block h-[1.1em] w-[2px] translate-y-[0.2em] bg-cyan-300 ${done ? 'animate-caret' : ''}`}
        />
      </span>
    </p>
  );
}
