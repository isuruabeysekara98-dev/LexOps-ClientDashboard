"use client";
import { useState } from "react";

type AccordionRowProps = {
  label: string;
  content?: string;
  defaultOpen?: boolean;
  index?: number;
};

export default function AccordionRow({ label, content, defaultOpen = false, index }: AccordionRowProps) {
  const [open, setOpen] = useState(defaultOpen);
  const num = index !== undefined ? String(index + 1).padStart(2, "0") : null;

  return (
    <div
      className={`rounded-xl transition-colors ${open ? "bg-slate-blue" : "border-b border-[#E8E8E8]"}`}
    >
      <button
        className="w-full flex items-center justify-between py-5 px-6 text-left group"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-4">
          {num && (
            <span className={`text-[13px] font-medium tabular-nums ${open ? "text-white/50" : "text-mid-gray"}`}>
              {num}
            </span>
          )}
          <span className={`text-[16px] leading-[24px] font-medium ${open ? "text-white" : "text-dark-gray"}`}>
            {label}
          </span>
        </div>
        <span
          className={`ml-4 shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            open ? "bg-white text-slate-blue" : "bg-[#F4F8FB] text-mid-gray group-hover:text-slate-blue"
          }`}
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </span>
      </button>
      {open && content && (
        <p className="text-[14px] leading-[22px] text-white/80 pb-5 px-6 max-w-2xl">{content}</p>
      )}
    </div>
  );
}
