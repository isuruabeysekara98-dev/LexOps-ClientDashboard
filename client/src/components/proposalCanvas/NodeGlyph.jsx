// ---------------------------------------------------------------------------
// The glyphs, as SVG — the same shapes the canvas draws, at key size.
// ---------------------------------------------------------------------------
// The map has had a real visual grammar since day 2: a trigger is a breathing
// ring, an AI step is a sphere with a core, a decision is faceted, an output is
// a flat disc with a notch, a system is a dashed anchor. None of that was ever
// explained. The key showed three coloured dots, so every one of those shapes
// read as decoration — the reader could see the map was saying something and
// had no way to find out what.
//
// These are deliberately *redrawn* rather than screenshotted off the canvas.
// A key built from a live canvas would need a second renderer, a second
// gradient cache and a second animation clock to show a 16px ring; SVG costs
// none of that and the shapes are simple enough that the two can't disagree
// visibly at this size. The rule to hold is that `draw.js` is the source of
// truth for geometry — if a shape changes there, change it here.
// ---------------------------------------------------------------------------
import { DARK } from "./theme.js";

/**
 * One glyph.
 *
 * @param kind   trigger | step | ai | hitl | gate | artifact | system | unmet
 * @param colour the hue this kind carries on the map
 * @param size   px, square
 */
export default function NodeGlyph({ kind, colour = DARK.machine, size = 18 }) {
  const c = size / 2;
  const r = size * 0.34;
  // A unique id per glyph instance, so two glyphs on the same page can't
  // capture each other's gradient. Derived from the inputs rather than random,
  // so it stays stable across re-renders.
  const gid = `ng-${kind}-${String(colour).replace(/[^a-z0-9]/gi, "")}-${size}`;

  const sphere = (
    <>
      <defs>
        <radialGradient id={gid} cx="34%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor={colour} stopOpacity="1" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={r} fill={`url(#${gid})`} />
    </>
  );

  let body;
  switch (kind) {
    // Emitter — no fill, plus the outer ring it breathes into.
    case "trigger":
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill="none" stroke={colour} strokeWidth={1.6} />
          <circle cx={c} cy={c} r={r + 2.6} fill="none" stroke={colour} strokeWidth={1} opacity={0.35} />
        </>
      );
      break;

    // A large, muted anchor. Dashed, low alpha, bubbles orbit it.
    case "system":
      body = (
        <circle
          cx={c} cy={c} r={r + 1.5}
          fill={colour} fillOpacity={0.16}
          stroke={colour} strokeOpacity={0.5} strokeWidth={1.2}
          strokeDasharray="2.5 3"
        />
      );
      break;

    // Angular reads as "a decision".
    case "gate": {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 6 + (i * Math.PI * 2) / 6;
        return `${(c + Math.cos(a) * r).toFixed(2)},${(c + Math.sin(a) * r).toFixed(2)}`;
      }).join(" ");
      body = (
        <>
          <defs>
            <radialGradient id={gid} cx="34%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="55%" stopColor={colour} stopOpacity="1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
            </radialGradient>
          </defs>
          <polygon points={pts} fill={`url(#${gid})`} />
        </>
      );
      break;
    }

    // A flat disc with a folded corner — a thing that got produced.
    case "artifact":
      body = (
        <>
          <circle cx={c} cy={c} r={r} fill={colour} fillOpacity={0.9} />
          <polygon
            points={`${c + r * 0.18},${c - r * 0.62} ${c + r * 0.62},${c - r * 0.62} ${c + r * 0.62},${c - r * 0.18}`}
            fill="#ffffff" fillOpacity={0.92}
          />
        </>
      );
      break;

    // Amber corona — "a person decides here", visible at any zoom.
    case "hitl":
      body = (
        <>
          <circle cx={c} cy={c} r={r + 2.4} fill={DARK.human} opacity={0.3} />
          {sphere}
        </>
      );
      break;

    // Inner core — a model runs inside this one.
    case "ai":
      body = (
        <>
          {sphere}
          <circle cx={c} cy={c} r={r * 0.42} fill={DARK.gold} fillOpacity={0.92} />
        </>
      );
      break;

    // Not a kind — the state. A dashed ring means we need something from you.
    case "unmet":
      body = (
        <>
          <circle cx={c} cy={c} r={r * 0.72} fill={colour} fillOpacity={0.55} />
          <circle
            cx={c} cy={c} r={r + 2}
            fill="none" stroke={DARK.human} strokeWidth={1.5} strokeDasharray="2.5 2.5"
          />
        </>
      );
      break;

    case "step":
    default:
      body = sphere;
  }

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0, display: "block", overflow: "visible" }}
      aria-hidden focusable="false"
    >
      {body}
    </svg>
  );
}
