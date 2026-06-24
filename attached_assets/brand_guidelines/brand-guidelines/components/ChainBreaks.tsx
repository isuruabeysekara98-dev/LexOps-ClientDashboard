"use client";

import { useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";

/* "The Chain of Custody" — a forged chain of links that breaks one link at a
   time on scroll; each break drags everything downstream into slack ruin. */

type BreakItem = { title: string; description: string };

function ChainLink({ broken, intensity }: { broken: boolean; intensity: number }) {
  // a single forged link; when broken its ring "opens" (dash gap) and greys out
  const stroke = broken ? "#9DB5C9" : "#375971";
  return (
    <svg width="78" height="116" viewBox="0 0 78 116" className="block w-[56px] h-[83px] sm:w-[78px] sm:h-[116px]">
      <rect
        x="15"
        y="14"
        width="48"
        height="88"
        rx="24"
        fill="none"
        stroke={stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={broken ? "150 70" : "1 0"}
        strokeDashoffset={broken ? 74 : 0}
        style={{ transition: "stroke 0.45s ease" }}
      />
      {broken && (
        <line
          x1={39 - 6}
          y1={58}
          x2={39 + 6}
          y2={58}
          stroke="#C9542E"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity={Math.min(0.7, 0.3 + intensity * 0.1)}
        />
      )}
    </svg>
  );
}

export default function ChainBreaks({ items }: { items: BreakItem[] }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const n = items.length;
  const [breakIndex, setBreakIndex] = useState(0); // how many links have snapped (0..n)

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setBreakIndex(Math.min(n, Math.max(0, Math.floor(v * (n + 1)))));
  });

  const active = breakIndex - 1; // the link/break currently in focus

  return (
    <section ref={ref} className="relative bg-white" style={{ height: `${(n + 1) * 58}vh` }}>
      <div className="sticky top-0 h-screen flex flex-col justify-center overflow-hidden pt-[88px] pb-10">
        <div className="container-site">
          {/* heading */}
          <div className="flex flex-col items-center text-center gap-4 max-w-[640px] mx-auto mb-12">
            <div className="flex items-center gap-2">
              <span className="w-[5px] h-[5px] rounded-full bg-light-slate inline-block" />
              <span className="text-[11px] uppercase tracking-widest font-medium text-light-slate">The breaks</span>
            </div>
            <h2 className="text-[clamp(30px,4vw,44px)] leading-[1.12] font-medium tracking-[-0.01em] text-dark-gray">
              Where legal workflows break down
            </h2>
            <p className="text-[15px] leading-[26px] text-mid-gray max-w-[520px]">
              One weak link rarely stays contained. Each break drags everything downstream into slack — until the whole chain comes apart.
            </p>
          </div>

          {/* the chain */}
          <div className="flex items-end justify-center mb-10 select-none">
            {items.map((_, i) => {
              const broken = i < breakIndex;
              const past = Math.max(0, breakIndex - i);
              const sag = broken ? 12 + past * 12 : 0;
              const rot = broken ? -7 - past * 1.6 : 0;
              return (
                <motion.div
                  key={i}
                  className={i > 0 ? "-ml-2.5 sm:-ml-3.5" : ""}
                  style={{ zIndex: n - i }}
                  animate={{ y: sag, rotate: rot, opacity: broken ? 0.55 : 1 }}
                  transition={{ type: "spring", stiffness: 150, damping: 16 }}
                >
                  <ChainLink broken={broken} intensity={past} />
                </motion.div>
              );
            })}
          </div>

          {/* active break copy */}
          <div className="max-w-[560px] mx-auto text-center min-h-[96px]">
            {breakIndex > 0 ? (
              <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <div className="text-[11px] uppercase tracking-widest text-slate-blue font-medium mb-2">
                  Break {String(active + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
                </div>
                <h3 className="text-[20px] font-medium text-dark-gray mb-2">{items[active].title}</h3>
                <p className="text-[14px] leading-[22px] text-mid-gray">{items[active].description}</p>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center gap-3 text-[12px] uppercase tracking-[0.18em] text-light-gray">
                <span className="w-8 h-px bg-light-gray/40" />
                Scroll to trace where it breaks
                <span className="w-8 h-px bg-light-gray/40" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
