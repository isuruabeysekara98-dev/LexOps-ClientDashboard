# Lex Ops · Process Atlas — Teams Squared demo

A three-depth process-mining UI in the Skan.ai visual language:

1. **Org graph** — a live force-directed mesh of departments, workflows, people and shared tools.
   No central node: the criss-cross emerges from shared people/tools. Real-time physics with
   perpetual organic drift, ambient particles and data pulses (Topology-style). Drag any node;
   double-click a department.
2. **Department view** — workflows side by side as cards. Click one to bring it into focus.
3. **Workflow focus window** — zoom in/out (buttons or `+`/`-`). Level 1 shows the most-traversed
   common path (spine from the observed transcripts); levels 2–3 progressively reveal synthetic
   variant traversals — rework loops (orange), detours (blue), skips (dashed) — with case counts
   and handoff durations. Click any activity for its case-filter inspector.

Pure static site — no build step, no dependencies.

## Run locally

```
npx serve -l 4173 .
```

(or any static server pointed at this folder). Also wired into `.claude/launch.json` as `process-atlas`.

## Deploy to Netlify

Drag-and-drop this folder at https://app.netlify.com/drop, or from this folder:

```
netlify deploy --dir . --prod
```

## Data

`data.js` — spine steps per workflow are condensed from the observed AW+screenshot candidate
workflows (WF1–WF11). Variant shares/counts are synthetic for the demo.
