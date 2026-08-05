// ---------------------------------------------------------------------------
// Numbers — the vocabulary, and the counts the map can vouch for itself.
// ---------------------------------------------------------------------------
// Two kinds of number appear on this page, and they are trusted for completely
// different reasons. Keeping them apart is the point of this file.
//
//   THE HEADLINE is time saved. It is a claim: someone has to vouch for it, and
//   that someone is us. It only ever renders when a graph actually carries the
//   figure — `formatMetric` returns null rather than inventing a unit, because a
//   confidently-rendered wrong number is worse than no number at all.
//
//   THE COUNTS are read off the graph. Nobody has to be trusted for "7 human
//   checkpoints" — the reader can count seven amber bubbles on the screen in
//   front of them. That self-evidencing quality is why they carry the map, and
//   it is also why they must never be hand-authored: the moment a count can
//   disagree with the drawing, it is worth less than nothing.
// ---------------------------------------------------------------------------

// Every unit key in the suite as authored. `one` / `many` so "1 week" doesn't
// read as "1 weeks", and `long` for the headline where there's room to breathe.
const UNITS = {
  // The headline unit. Countable, checkable against the client's own process,
  // and it needs no defending — which is why it replaced hours saved.
  steps_eliminated:  { one: "step removed",      many: "steps removed",
                       long: "steps removed from how this runs today" },
  hrs_month:         { one: "hour a month",      many: "hours a month",      long: "hours a month" },
  min_per_task:      { one: "minute",            many: "minutes",            long: "minutes per task, today" },
  weeks:             { one: "week",              many: "weeks" },
  stages:            { one: "stage",             many: "stages" },
  documents:         { one: "document",          many: "documents" },
  systems:           { one: "system",            many: "systems" },
  resources:         { one: "resource",          many: "resources" },
  topic_areas:       { one: "topic area",        many: "topic areas" },
  matter_categories: { one: "matter category",   many: "matter categories" },
  pct_revenue:       { one: "% of revenue",      many: "% of revenue", bare: true },
};

/**
 * A unit key rendered for humans. Unknown keys degrade to a de-underscored
 * version rather than printing `min_per_task` at a partner — but they're a bug,
 * so they're logged once in dev.
 */
export function unitLabel(unit, amount = 2, style = "short") {
  const entry = UNITS[unit];
  if (!entry) {
    if (typeof console !== "undefined" && unit) {
      console.warn(`[units] no vocabulary for "${unit}" — add it to units.js`);
    }
    return String(unit || "").replace(/_/g, " ");
  }
  if (style === "long" && entry.long) return entry.long;
  return Math.abs(amount) === 1 ? entry.one : entry.many;
}

/** True where the number and its unit run together: "75% of revenue". */
export const unitIsBare = (unit) => !!UNITS[unit]?.bare;

/**
 * A headline metric, ready to render — or null when there's nothing honest to
 * show. `null` is a real answer here: it's what stops a graph with no figure
 * from growing one.
 */
export function formatMetric(metric) {
  if (!metric || metric.amount == null || Number.isNaN(Number(metric.amount))) return null;
  const amount = Number(metric.amount);
  return {
    amount: amount.toLocaleString(),
    unit: unitLabel(metric.unit, amount, "long"),
    bare: unitIsBare(metric.unit),
    basis: metric.basis || null,
    // Time saved is the one unit we're asserting rather than quoting, so it's
    // the one that has to survive being asked "says who?".
    isClaim: metric.unit === "hrs_month",
  };
}

// ---------------------------------------------------------------------------
// Counts off the map
// ---------------------------------------------------------------------------
/**
 * Everything here is derived from the nodes the canvas is drawing, in the same
 * render pass. There is deliberately no way to author these.
 */
export function graphCounts(nodes = [], unmetIds) {
  const counts = {
    steps: 0,           // everything that happens, minus the anchors
    human: 0,           // a person decides — the trust question
    ai: 0,
    outputs: 0,         // artifacts: the things you end up holding
    systems: 0,
    needs: 0,           // required needs still open
  };

  for (const n of nodes) {
    if (n.kind === "system") counts.systems += 1;
    else counts.steps += 1;

    if (n.kind === "hitl" || n.kind === "gate" || n.actor === "human_client" || n.actor === "human_lexops") {
      counts.human += 1;
    }
    if (n.kind === "ai" || n.actor === "ai") counts.ai += 1;
    if (n.kind === "artifact") counts.outputs += 1;
    if (unmetIds?.has(n.id)) counts.needs += 1;
  }

  return counts;
}

/**
 * The counts as a strip, already phrased. Ordered by what a partner asks first:
 * where a person is still involved, then what the machine does, then what they
 * end up with. Anything that would read "0" is dropped rather than shown empty.
 */
export function countChips(counts) {
  const chips = [
    { key: "human",   value: counts.human,   label: counts.human === 1 ? "human checkpoint" : "human checkpoints", tone: "amber" },
    { key: "ai",      value: counts.ai,      label: counts.ai === 1 ? "AI step" : "AI steps", tone: "purple" },
    { key: "outputs", value: counts.outputs, label: counts.outputs === 1 ? "thing you get back" : "things you get back", tone: "green" },
    { key: "steps",   value: counts.steps,   label: counts.steps === 1 ? "step in the flow" : "steps in the flow", tone: "ink" },
  ];
  return chips.filter((c) => c.value > 0);
}
