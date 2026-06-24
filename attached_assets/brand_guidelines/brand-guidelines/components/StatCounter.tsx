"use client";

import { useEffect, useRef, useState } from "react";

/* Counts the numeric part of a stat up from zero when it scrolls into view.
   Preserves any prefix/suffix, e.g. "6+" → 0+→6+, "Top 5%" → "Top 0%"→"Top 5%". */

export default function StatCounter({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  const match = value.match(/(\d[\d,]*\.?\d*)/);
  const hasNumber = !!match;
  const target = match ? parseFloat(match[1].replace(/,/g, "")) : 0;
  const prefix = match ? value.slice(0, match.index ?? 0) : value;
  const suffix = match ? value.slice((match.index ?? 0) + match[1].length) : "";
  const decimals = match && match[1].includes(".") ? (match[1].split(".")[1]?.length ?? 0) : 0;

  useEffect(() => {
    if (!hasNumber) return;
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let started = false;
    const animate = () => {
      if (started) return;
      started = true;
      const duration = 1400;
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setN(eased * target);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          animate();
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [hasNumber, target]);

  if (!hasNumber) return <span ref={ref} className={className}>{value}</span>;

  const display = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toLocaleString();
  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
