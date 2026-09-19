import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';

/** Decorative signal reflects agent state, not microphone volume. */
export function Signal({ active = false }: { active?: boolean }) {
  return <span className={`signal ${active ? 'is-active' : ''}`} aria-hidden="true">
    {Array.from({ length: 17 }, (_, i) => <i key={i} style={{ '--bar': `${12 + (Math.sin(i * 1.8) + 1) * 16}px`, '--delay': `${i * -0.13}s` } as CSSProperties} />)}
  </span>;
}

export function DispatchOrbit({ active = false, complete = false }: { active?: boolean; complete?: boolean }) {
  return <div className={`dispatch-orbit ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`} aria-hidden="true">
    <div className="orbit-path orbit-outer"><span /></div>
    <div className="orbit-path orbit-inner"><span /></div>
    <div className="orbit-core">{complete ? <Check size={34} /> : <Sparkles size={32} />}</div>
    <span className="orbit-label orbit-label-top"><i />{complete ? 'Spot recovered' : active ? 'Finding your match' : 'Ready for the next opening'}</span>
    <span className="orbit-label orbit-label-bottom"><ArrowUpRight size={13} />{complete ? 'Everyone wins.' : 'A little opening. A big opportunity.'}</span>
  </div>;
}

export function AnimatedMoney({ cents }: { cents: number }) {
  const reduceMotion = useReducedMotion();
  const previous = useRef(cents);
  const [display, setDisplay] = useState(cents);
  useEffect(() => {
    const from = previous.current;
    previous.current = cents;
    if (reduceMotion || from === cents) { setDisplay(cents); return; }
    let frame: number;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - started) / 850, 1);
      setDisplay(Math.round(from + (cents - from) * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents, reduceMotion]);
  const format = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value / 100);
  return <><span aria-hidden="true">{format(display)}</span><span className="sr-only">{format(cents)}</span></>;
}
