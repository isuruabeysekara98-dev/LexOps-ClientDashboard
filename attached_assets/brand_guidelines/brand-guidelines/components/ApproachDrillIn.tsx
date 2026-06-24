"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* Drill-In approach: the homepage's isometric glass-tile language, but
   selecting a phase zooms it open into a deep-dive (steps + deliverables). */

type Phase = {
  n: string;
  t: string;
  b: string;
  deep: { blurb: string; steps: string[]; deliverables: string[] };
};

const PLATE = 300;

export default function ApproachDrillIn({ phases }: { phases: Phase[] }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="grid lg:grid-cols-[0.82fr_1.18fr] gap-10 items-center">
      {/* LEFT — phase pills */}
      <div className="flex flex-col gap-3 w-full max-w-[440px]">
        {phases.map((p, i) => {
          const isActive = active === i;
          const dim = active !== null && !isActive;
          return (
            <button key={p.n} type="button" onClick={() => setActive(isActive ? null : i)} className="text-left w-full">
              <div
                className={`rounded-2xl border px-6 py-5 transition-all duration-300 ${isActive
                  ? "bg-dark-gray border-dark-gray shadow-[0_24px_50px_-24px_rgba(35,42,52,0.55)]"
                  : dim
                    ? "bg-white border-black/[0.06] opacity-55"
                    : "bg-white border-black/[0.08] hover:border-slate-blue/40"}`}
              >
                <div className="text-[12px] uppercase tracking-[0.16em] text-light-slate mb-1">{p.n}</div>
                <div className={`text-[16px] font-medium ${isActive ? "text-white" : "text-dark-gray"}`}>{p.t}</div>
                {!isActive && <p className="text-[13px] leading-[20px] text-mid-gray mt-1.5">{p.b}</p>}
              </div>
            </button>
          );
        })}

        <AnimatePresence>
          {active !== null && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActive(null)}
              className="self-start mt-1 text-[13px] font-medium text-slate-blue hover:text-dark-gray inline-flex items-center gap-1.5"
            >
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M11 6H1M6 1L1 6l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Back to overview
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT — overview stack OR drilled-in detail */}
      <div className="relative w-full min-h-[420px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {active === null ? (
            <motion.div
              key="overview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.4 }}
              // the 45°-rotated plates render ~1.4× wider than PLATE — scale
              // the overview down on phones so it can't overflow the viewport
              className="relative w-full scale-[0.72] sm:scale-100"
              style={{ height: 380 }}
            >
              {phases.map((p, i) => {
                const baseY = (i - (phases.length - 1) / 2) * 56;
                const top = i === phases.length - 1;
                return (
                  <div key={p.n} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: i }}>
                    <div className="relative" style={{ width: PLATE, height: PLATE, transform: `translateY(${baseY}px)` }}>
                      <div
                        className="absolute inset-0 rounded-[40px] border border-white/60 bg-gradient-to-br from-white/70 to-white/25 shadow-[0_40px_70px_-30px_rgba(35,42,52,0.35)]"
                        style={{ transform: "scaleY(0.6) rotate(45deg)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
                      >
                        <div className="absolute inset-5 rounded-[32px] border border-white/40" />
                      </div>
                      {top && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[12px] uppercase tracking-[0.18em] text-light-gray">Select a phase</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key={active}
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <DetailCard phase={phases[active]} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function DetailCard({ phase }: { phase: Phase }) {
  return (
    <div className="rounded-3xl border border-slate-blue/15 bg-gradient-to-br from-light-blue/60 via-white to-white p-8 shadow-[0_40px_90px_-40px_rgba(55,89,113,0.4)]">
      <div className="text-[12px] uppercase tracking-[0.18em] text-slate-blue font-medium mb-2">{phase.n}</div>
      <h3 className="text-[26px] leading-[32px] font-medium text-dark-gray mb-3">{phase.t}</h3>
      <p className="text-[15px] leading-[24px] text-mid-gray mb-7 max-w-[640px]">{phase.deep.blurb}</p>
      <div className="grid sm:grid-cols-2 gap-8">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-light-slate font-medium mb-3.5">What happens</div>
          <ol className="flex flex-col gap-3">
            {phase.deep.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-[14px] leading-[21px] text-dark-gray">
                <span className="w-5 h-5 rounded-full bg-slate-blue text-white text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-widest text-light-slate font-medium mb-3.5">What we deliver</div>
          <ul className="flex flex-col gap-3">
            {phase.deep.deliverables.map((d) => (
              <li key={d} className="flex gap-3 text-[14px] leading-[21px] text-dark-gray">
                <span className="w-5 h-5 rounded-full bg-white border border-slate-blue/30 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="#375971" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
