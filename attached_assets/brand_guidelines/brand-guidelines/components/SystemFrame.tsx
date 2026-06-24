/* ============================================================= *
 *  SYSTEM FRAME — LexOps-branded window chrome.
 *
 *  Replaces generic macOS traffic-light mockup chrome with the
 *  brand's own language: the dot-caption eyebrow, a module path,
 *  and a live status pill. Used by the homepage console and the
 *  case-study system views.
 * ============================================================= */

type SystemFrameProps = {
  /** caption shown next to the brand mark, e.g. "LexOps · Intake" */
  label: string;
  /** centre path / breadcrumb, e.g. "matter / will-poa-guardianship" */
  path?: string;
  /** right-hand status pill text; omit to hide */
  status?: string;
  /** pulse dot colour for the status pill */
  statusTone?: "green" | "blue";
  dark?: boolean;
  className?: string;
  children: React.ReactNode;
};

export default function SystemFrame({
  label,
  path,
  status,
  statusTone = "green",
  dark = false,
  className = "",
  children,
}: SystemFrameProps) {
  const tone =
    statusTone === "green"
      ? { dot: "bg-[#3C7A52]", text: "text-[#3C7A52]", bg: dark ? "bg-[#3C7A52]/15" : "bg-[#E7F3EC]" }
      : { dot: "bg-light-slate", text: dark ? "text-light-slate" : "text-slate-blue", bg: dark ? "bg-white/[0.06]" : "bg-light-blue/70" };

  return (
    <div
      className={`rounded-2xl overflow-hidden border ${
        dark
          ? "border-white/[0.08] bg-[#0F141A]"
          : "border-black/[0.08] bg-white"
      } ${className}`}
    >
      {/* chrome bar */}
      <div
        className={`flex items-center gap-3 px-4 h-11 border-b ${
          dark ? "bg-white/[0.03] border-white/[0.06]" : "bg-[#F6F8FA] border-black/[0.06]"
        }`}
      >
        {/* brand mark — the eyebrow dot, scaled into a chip */}
        <span className="flex items-center gap-2 shrink-0">
          <span className="w-[18px] h-[18px] rounded-[5px] bg-slate-blue flex items-center justify-center">
            <span className="w-[5px] h-[5px] rounded-full bg-light-blue" />
          </span>
          <span className={`text-[11px] uppercase tracking-[0.16em] font-medium ${dark ? "text-light-slate" : "text-mid-gray"}`}>
            {label}
          </span>
        </span>

        {/* centre path */}
        {path && (
          <div className="flex-1 hidden sm:flex justify-center min-w-0">
            <span
              className={`text-[12px] truncate rounded-md px-3 py-1 border ${
                dark
                  ? "text-white/45 bg-white/[0.04] border-white/[0.07]"
                  : "text-light-gray bg-white border-black/[0.06]"
              }`}
            >
              {path}
            </span>
          </div>
        )}
        {!path && <div className="flex-1" />}

        {/* status pill */}
        {status && (
          <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 ${tone.bg} ${tone.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${tone.dot} animate-pulse`} />
            {status}
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
