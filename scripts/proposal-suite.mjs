// ---------------------------------------------------------------------------
// The proposal suite as graphs.
// ---------------------------------------------------------------------------
// Authored from the real proposals in
//   `4. Proposal generator/ts2-proposal-creator/templates/<slug>/partials/`
// Node labels, descriptions, gives and assumptions come from what each proposal
// actually says. `needs` come from each proposal's "What we need from you" /
// "requirements" page — these are the questions we'd otherwise chase during
// onboarding week.
//
// Two filter axes, same interaction, different questions:
//   `deliverable` — which piece of work is this? (disjoint subgraphs)
//   `scenarios`   — which path does this case type take? (subsets of one flow)
//
// VALUES ARE DERIVED, NOT COMMITTED. Where a proposal states a time cost
// ("10–15 min per checklist"), `value` is derived from it and the derivation is
// recorded in `headline_metric.basis`. Where a proposal states nothing, value is
// omitted and the bubble should size on effort. Nothing here is a defensible
// hrs/month figure — see LIVING-PROPOSAL-PLAN.md §7 Q2.
// ---------------------------------------------------------------------------

export const SUITE = [
  // =========================================================================
  // BR LEGAL — two outcomes, both starting outside LEAP
  // =========================================================================
  {
    slug: "br-legal",
    name: "Beena Rezaee Legal & Migration — Phase 1",
    client_name: "Beena Rezaee Legal & Migration",
    client_contact_name: "Beena Rezaee",
    pain_points: [
      "Non-English callers reach a voice agent that tries to transcribe and route at once — the call bounces",
      "Two voice agents have already been tried and both broke in the same place",
      "Departmental checklists sit in an inbox until someone remembers to open them",
      "10–15 minutes of manual handling per checklist, across twelve steps where a deadline can go missing",
    ],
    objectives: [
      "Answer non-English callers in their own language and book them into a real calendar slot",
      "Land every departmental action item on the right matter, with the right lawyer and a date",
      "Bring service excellence to the immigration workflows that begin outside LEAP",
    ],
    graph: {
      preset: "pipeline",
      headline: "Both workflows start outside LEAP — on the phone line and in the inbox. That is where the work is picked up.",
      headline_metric: { unit: "min_per_task", amount: 15, basis: "manual handling per departmental checklist today, across 12 steps (Outcome 2 page)" },
      deliverables: [
        { id: "oc1", label: "Multilingual intake", summary: "Non-English callers answered in their own language, routed, and booked — without a lawyer setting up the line.", metric: { unit: "weeks", amount: 8, basis: "8-week build" } },
        { id: "oc2", label: "Docs & deadlines", summary: "Every departmental action item lands on the right matter, with the right lawyer and a date, the moment it arrives.", metric: { unit: "weeks", amount: 4, basis: "4-week build" } },
      ],
      nodes: [
        // ---- Outcome 1 · multilingual intake ----
        { id: "call-in", kind: "trigger", actor: "system", cluster: "intake", deliverable: "oc1",
          label: "Inbound call", stakeholder: ["Your inbound number"], action: "A non-English caller",
          description: "A large share of matter volume arrives from non-English speaking callers. Today the call bounces back to a human, or off the line entirely.",
          confidence: "committed",
          needs: [{ id: "number-pointing", type: "confirm", required: true, prompt: "Can your inbound number be pointed at the Bland.ai line during the build?", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "The call is answered", detail: "Rather than bouncing to a person who may not speak the language." }],
          assumptions: ["Assumes the inbound number can be redirected without a carrier change"] },

        { id: "language-select", kind: "step", actor: "system", cluster: "intake", deliverable: "oc1",
          label: "Language select", stakeholder: ["Bland.ai"], action: "Caller chooses, not guessed",
          description: "Language is chosen, not guessed. This is the separation of concerns that the two previous agents lacked — nothing is transcribing and routing at the same time.",
          confidence: "committed",
          needs: [{ id: "language-set", type: "longtext", required: true, prompt: "Confirm the language set for the line (Farsi, Urdu, Arabic, English) and who handles each" }],
          gives: [{ label: "The language is resolved before anyone speaks", detail: "" }],
          assumptions: ["Assumes four languages; each additional language is another agent"] },

        { id: "voice-agent", kind: "ai", actor: "ai", cluster: "intake", deliverable: "oc1",
          label: "Voice agent", stakeholder: ["Bland.ai"], action: "Transcribe and interpret",
          description: "One agent, one language — it only has to listen. The agent transcribes 'who would you like to speak to, and about what', and interprets it. It does not decide who is available.",
          confidence: "committed",
          needs: [{ id: "bland-account", type: "confirm", required: true, prompt: "A Bland.ai account for the voice agents — LexOps configures it", confirm_label: "Yes, set one up" }],
          gives: [{ label: "A transcribed, interpreted request", detail: "In the caller's own language." }],
          assumptions: ["Assumes Bland.ai supports each confirmed language at production quality"] },

        { id: "routing-gate", kind: "gate", actor: "system", cluster: "route", deliverable: "oc1",
          label: "Router", stakeholder: ["Outlook"], action: "Named lawyer, or any slot",
          description: "Routing is a separate decision, made against real Outlook availability. Named and available routes straight through; named and unavailable, or no name at all, goes to slot selection.",
          confidence: "committed",
          scenarios: ["named-available", "named-unavailable", "any-appointment"],
          needs: [{ id: "routing-rules", type: "longtext", required: true, prompt: "How should calls route — which lawyer covers which practice area, and the fallback order when they're unavailable?" }],
          gives: [{ label: "Nothing left to bounce on", detail: "Every path has a defined next step." }],
          assumptions: ["Assumes routing rules can be agreed once and change rarely"] },

        { id: "outlook-availability", kind: "system", actor: "system", cluster: "route", deliverable: "oc1",
          label: "Outlook", stakeholder: ["Microsoft 365"], action: "Read team availability",
          description: "Availability is read live from Outlook, not promised as a callback. The agent pulls live team availability from Outlook and offers the 2–3 most immediate slots, in the caller's language.",
          confidence: "committed",
          needs: [{ id: "m365-access", type: "confirm", required: true, prompt: "API access to Microsoft 365 (Outlook mail and calendars) for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "Live availability, not a callback promise", detail: "" }],
          assumptions: ["Assumes lawyer calendars in Outlook are kept current enough to book against"] },

        { id: "booking", kind: "artifact", actor: "system", cluster: "route", deliverable: "oc1",
          label: "Booking", stakeholder: ["Outlook"], action: "Block it before they hang up",
          description: "The appointment exists before the caller hangs up. The caller confirms a slot, the confirmation is transcribed, and the agent blocks the calendar in Outlook before the call ends — the appointment exists by the time they hang up.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "A confirmed appointment", detail: "Without touching a lawyer's day, and with no callback needed." }],
          assumptions: ["Assumes the agent may write to the relevant Outlook calendars"] },

        { id: "oc1-uat", kind: "hitl", actor: "human_client", cluster: "route", deliverable: "oc1",
          label: "UAT sign-off", stakeholder: ["Your team"], action: "You accept the line",
          description: "You accept the line on real calls, not on a demo. The line runs on real inbound calls and meets the acceptance criteria defined together at discovery. Outcome 2 build starts only after this.",
          confidence: "committed",
          needs: [{ id: "uat-availability", type: "text", required: false, prompt: "Who will run the UAT calls, and in which languages?" }],
          gives: [{ label: "A signed-off line", detail: "Demoed live on your chosen call scenarios across each supported language." }],
          assumptions: ["Assumes your team can run UAT calls in each supported language"] },

        // ---- Outcome 2 · documents & deadlines ----
        { id: "dept-email", kind: "trigger", actor: "system", cluster: "inbox", deliverable: "oc2",
          label: "Checklist email", stakeholder: ["Dept. of Immigration", "Outlook"], action: "Arrives from Immigration",
          description: "A document checklist lands from the Department of Immigration. Today the only thing between the inbox and a missed deadline is someone remembering to open it.",
          confidence: "committed",
          needs: [{ id: "sample-emails", type: "file", required: true, prompt: "A sample of recent Department of Immigration checklist emails and attachments" }],
          gives: [{ label: "Every inbound email is seen", detail: "The decisioning layer listens to all of them." }],
          assumptions: ["Assumes checklist emails arrive at a mailbox we are permitted to watch"] },

        { id: "matter-identify", kind: "step", actor: "system", cluster: "inbox", deliverable: "oc2",
          label: "Matter lookup", stakeholder: ["LEAP"], action: "Match the client",
          description: "Most emails match one client with one open matter. The layer scans the body and identifies the client — how many matters do they have open? One matter ships directly. Deterministic, no AI needed. Most emails land here.",
          confidence: "committed",
          scenarios: ["one-matter"],
          needs: [{ id: "matter-structure", type: "longtext", required: true, prompt: "How are matter structures, task types and deadline fields set up in LEAP today?" }],
          gives: [{ label: "The thread on the right matter", detail: "Without AI touching it." }],
          assumptions: ["Assumes client identity is resolvable from the email body in most cases"] },

        { id: "ai-match", kind: "ai", actor: "ai", cluster: "inbox", deliverable: "oc2",
          label: "AI match", stakeholder: ["AI model", "LEAP"], action: "Pick the right matter",
          description: "Where a client has several matters, the model picks one. Where a client has more than one open matter, the model reads the body against the matter details and picks one, with a confidence score attached.",
          confidence: "committed",
          scenarios: ["multi-matter"],
          needs: [],
          gives: [{ label: "A matter, with a confidence score", detail: "Never filed blindly." }],
          assumptions: ["Assumes matter details in LEAP are complete enough to tell matters apart"] },

        { id: "poc-review", kind: "hitl", actor: "human_client", cluster: "inbox", deliverable: "oc2",
          label: "POC review", stakeholder: ["Your POC"], action: "A person checks the doubt",
          description: "A person checks anything the model is unsure about. Below the confidence threshold, the email is raised to a designated point of contact for a quick review before shipping. A human check only when unsure.",
          confidence: "committed",
          scenarios: ["low-confidence"],
          needs: [{ id: "poc-name", type: "contact", required: true, prompt: "Who is the designated POC for low-confidence reviews?" }],
          gives: [{ label: "Nothing filed blindly", detail: "A person adjudicates every uncertain match." }],
          assumptions: ["Assumes a named POC is available to clear the queue promptly"] },

        { id: "checklist-extract", kind: "ai", actor: "ai", cluster: "extract", deliverable: "oc2",
          label: "Extract items", stakeholder: ["AI model"], action: "Read the checklist",
          description: "An LLM reads the attached checklist and extracts every action item. Today this is steps 7 and 8 of twelve — 180 seconds of reading and 150 of extraction.",
          confidence: "committed",
          needs: [{ id: "checklist-shape", type: "longtext", required: false, prompt: "How are action items and deadlines structured in LEAP today?" }],
          gives: [{ label: "Every action item, extracted", detail: "With its deadline." }],
          assumptions: ["Assumes checklists arrive as machine-readable PDFs, not scans"] },

        { id: "leap-write", kind: "artifact", actor: "system", cluster: "extract", deliverable: "oc2",
          label: "Write to LEAP", stakeholder: ["LEAP"], action: "Assigned, with deadlines",
          description: "Automation writes the document and the items into LEAP against the matter. Deadlines are set and each item is assigned to the responsible lawyer.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "The deadline is owned from the moment it lands", detail: "Not from the moment someone opens the email." }],
          assumptions: ["Assumes LEAP permits automated task creation against a matter"] },

        { id: "leap", kind: "system", actor: "system", cluster: "extract", deliverable: "oc2",
          label: "LEAP", stakeholder: ["Case management"], action: "Your practice system",
          description: "The firm is already mature in the AI that lives inside LEAP. The steps outside it are the ones still carried by people — which is why both outcomes start there.",
          confidence: "committed",
          needs: [{ id: "leap-api", type: "confirm", required: true, prompt: "API access to LEAP for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "No second system to keep in sync", detail: "" }],
          assumptions: ["Preliminary — the definitive access list is confirmed with your IT lead during discovery week"] },
      ],
      edges: [
        { from: "call-in", to: "language-select", kind: "triggers" },
        { from: "language-select", to: "voice-agent", kind: "triggers" },
        { from: "voice-agent", to: "routing-gate", kind: "data" },
        { from: "routing-gate", to: "outlook-availability", kind: "depends" },
        { from: "outlook-availability", to: "booking", kind: "data" },
        { from: "booking", to: "oc1-uat", kind: "triggers" },
        { from: "dept-email", to: "matter-identify", kind: "triggers" },
        { from: "matter-identify", to: "ai-match", kind: "depends" },
        { from: "ai-match", to: "poc-review", kind: "depends" },
        { from: "matter-identify", to: "checklist-extract", kind: "data" },
        { from: "poc-review", to: "checklist-extract", kind: "data" },
        { from: "checklist-extract", to: "leap-write", kind: "data" },
        { from: "leap-write", to: "leap", kind: "data" },
      ],
      scenarios: [
        { id: "named-available", label: "Named lawyer, available" },
        { id: "named-unavailable", label: "Named lawyer, unavailable" },
        { id: "any-appointment", label: "Just wants an appointment" },
        { id: "one-matter", label: "Client has one matter" },
        { id: "multi-matter", label: "Client has several matters" },
        { id: "low-confidence", label: "AI not confident" },
      ],
      // Acts III–V, quoted from the proposal rather than restated.
      //
      // Every figure below appears verbatim in `br-legal/partials/3_roadmap.html`
      // and `4_what_we_need.html`. Week spans are read off the Gantt's own grid
      // columns (col N = week N-2), so the bars here and the bars in the PDF are
      // the same bars. Nothing is computed on the client — in particular the
      // total is stored, not summed, because the discount is a negotiated line
      // and a client-side sum would silently disagree with the quote the moment
      // anyone edits a row.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "This plan is entirely optional. Because documentation and short videos are part of the build, Beena Rezaee Legal & Migration can take full ownership and self-maintain from day one \u2014 we are happy to hand the system over to you at the end of the build. The options below are available only if you would prefer us to keep it running.",
          covers: [
            "Tweaks to workflow logic \u2014 language routing, call prompts, extraction rules and confidence thresholds adjusted as your process shifts",
            "Configuration changes driven by platform updates \u2014 when LEAP, Outlook or the telephony provider change, we keep the integrations working",
          ],
          options: [
            { id: "managed", name: "Option 1 \u2014 Fully Managed", amount: 795, per: "month", approx: true, recommended: true,
              covers: [
                "Maintenance of the voice agent platform (Bland.ai)",
                "Maintenance of the automation platform for email tracking",
                "LexOps charge for a 10-hour block of maintenance \u2014 $350",
              ],
              footnote: "Approx. $445 platform running costs plus the $350 LexOps 10-hour block. Recommended for the first three months." },
            { id: "self", name: "Option 2 \u2014 Self-Managed", amount: 175, per: "5-hour block",
              covers: [
                "$175 for a 5-hour block of LexOps maintenance",
                "We offboard platform maintenance to you \u2014 your team runs Bland.ai and the automations",
              ],
              footnote: "Bought only as you need it. Platform running costs of approx. $445 / month are billed to you directly by the provider." },
          ],
          caveat: "LexOps time is charged at a flat $35 / hour in both options.",
        },
        roadmap: {
          weeks: 13,
          note: "Phase 1 is a 12-week build — 8 weeks for multilingual intake, then 4 weeks for document & deadline management — or 13 weeks end-to-end once the discovery week is included. The voice agent goes first: it is the deeper build, it carries the client experience, and the two outcomes share the same Outlook and LEAP foundations, so the second lands faster on the back of the first.",
          caveat: "This timeline is preliminary — actual timelines are subject to change.",
          lanes: [
            { id: "discovery",    label: "Discovery & Solution Design",       deliverable: "oc1", start_week: 0,  end_week: 1,  kind: "discovery" },
            { id: "oc1-routing",  label: "Build — Language Routing & Agents", deliverable: "oc1", start_week: 1,  end_week: 4,  kind: "build" },
            { id: "oc1-booking",  label: "Build — Calendar & Booking",        deliverable: "oc1", start_week: 4,  end_week: 6,  kind: "build" },
            { id: "oc1-uat",      label: "UAT & Refinement",                  deliverable: "oc1", start_week: 6,  end_week: 8,  kind: "uat" },
            { id: "oc1-golive",   label: "Go-Live & Handover",                deliverable: "oc1", start_week: 8,  end_week: 9,  kind: "golive" },
            { id: "oc2-match",    label: "Build — Email & Matter Matching",   deliverable: "oc2", start_week: 9,  end_week: 10, kind: "build" },
            { id: "oc2-extract",  label: "Build — Extraction & LEAP Tasks",   deliverable: "oc2", start_week: 10, end_week: 11, kind: "build" },
            { id: "oc2-uat",      label: "UAT & Refinement",                  deliverable: "oc2", start_week: 11, end_week: 12, kind: "uat" },
            { id: "oc2-golive",   label: "Go-Live & Handover",                deliverable: "oc2", start_week: 12, end_week: 13, kind: "golive" },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", deliverable: "oc1", amount: 8000,
              item: "Outcome 1 — Multilingual intake & appointment setting",
              basis: "Language routing, per-language voice agents on Bland.ai, live Outlook availability and booking. 8-week build." },
            { kind: "line", deliverable: "oc2", amount: 4000,
              item: "Outcome 2 — Document & deadline management",
              basis: "Departmental email triage, checklist extraction, and assigned, dated action items in LEAP. 4-week build." },
            { kind: "discount", amount: -2000,
              item: "Phase 1 discount",
              basis: "Offered on the basis that both outcomes are committed together in a single 12-week engagement." },
          ],
          total: { label: "Total Phase 1 investment", amount: 10000, was: 12000 },
          note: "Estimate for the scope on the Phase 1 Deliverables pages, confirmed at discovery before build starts.",
          // Ongoing costs live in `maintenance` below, not here — Act IV is what
          // the build costs, Act V is what keeping it running costs, and a
          // recurring row inside the build total invites them to be added up.
        },
      },

      // Two explainers, not fourteen. Each answers the objection that actually
      // decides this proposal — the one a partner raises before they raise
      // anything else. Node-level explainers were rejected in PLAN.md §2b: at
      // 20–40 minutes of thought each, 79 nodes is tens of hours per client.
      //
      // A beat is a line of copy plus an operation against the map already on
      // screen: `focus` lights a set of nodes and dims the rest, `select` opens
      // one. Nothing here draws its own boards, so an explainer can never drift
      // from the graph — it addresses the same node ids the canvas does.
      explainers: [
        {
          id: "why-this-one-holds",
          anchor: "voice-agent",
          seconds: 10,
          title: "Why this one won't break",
          // The objection: "we've tried this twice and it broke both times."
          // Answered by naming the *shared* failure and showing the split.
          beats: [
            { dur: 2.6, line: "Two voice agents have been tried.",
              sub: "Both broke in the same place.",
              focus: ["voice-agent"], select: "voice-agent" },
            { dur: 2.6, line: "Each was transcribing and routing at once.",
              sub: "One job too many, on the call.",
              focus: ["voice-agent", "routing-gate"] },
            { dur: 2.4, line: "So the language is chosen first.",
              sub: "Chosen by the caller — not guessed.",
              focus: ["language-select"], select: "language-select" },
            { dur: 2.4, line: "And routing becomes its own decision.",
              sub: "Made against live Outlook availability.",
              focus: ["routing-gate", "outlook-availability"], select: "routing-gate" },
          ],
        },
        {
          id: "ai-only-where-needed",
          anchor: "matter-identify",
          seconds: 10,
          title: "Where the AI actually runs",
          // The objection: "I'm not having a model file my immigration
          // deadlines." Answered by showing how little of the path is AI.
          beats: [
            { dur: 2.5, line: "Most checklist emails never touch AI.",
              sub: "One open matter — the match is deterministic.",
              focus: ["dept-email", "matter-identify"], select: "matter-identify" },
            { dur: 2.5, line: "That path ships straight through.",
              sub: "Extracted, written to LEAP, deadlines set.",
              focus: ["matter-identify", "checklist-extract", "leap-write"] },
            { dur: 2.5, line: "Several matters, and the model picks one.",
              sub: "With a confidence score attached.",
              focus: ["ai-match"], select: "ai-match" },
            { dur: 2.5, line: "Below the threshold, a person decides.",
              sub: "Nothing is filed blindly.",
              focus: ["poc-review"], select: "poc-review" },
          ],
        },
      ],
    },
  },

  // =========================================================================
  // CFLS — one outcome: document management into Actionstep
  // =========================================================================
  {
    slug: "creative-family-law-v3",
    name: "Creative Family Law Solutions — Phase 1",
    client_name: "Creative Family Law Solutions",
    client_contact_name: null,
    pain_points: [
      "New documents, ICL requests and court updates land in Outlook first — outside Actionstep",
      "Filing one document means moving between Outlook, Actionstep and the plug-in — around 15 steps, every time",
      "10–15 minutes of lawyer or paralegal time per document, repeated dozens of times a day",
    ],
    objectives: [
      "Documents that arrive by email file themselves to the right matter — no lookups, no plug-in, no missed filing",
    ],
    graph: {
      preset: "pipeline",
      headline: "Work begins in email. Fix the most repeated task once, and the same pipeline powers tracking, chasing and follow-ups.",
      headline_metric: { unit: "min_per_task", amount: 15, basis: "lawyer or paralegal time to file a single document today, across ~15 steps" },
      deliverables: [
        { id: "track1", label: "Document management", summary: "Documents arriving by email file themselves into Actionstep, with a human check only when unsure.", metric: { unit: "weeks", amount: 3, basis: "3-week build, ~6 weeks end to end" } },
      ],
      // Acts III-V, quoted from `3d_milestone_plan.html` and `4_what_we_need.html`.
      // Week spans are read off the milestone grid's own columns. The audit lane
      // overlaps the build because the proposal says it runs in parallel from
      // day one, not after.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "Rather than an open-ended retainer, we propose a time-boxed stabilisation window. The months right after handover are when monitoring and small changes actually matter; after that it is more of a top-up \u2014 you buy hours only as you use them.",
          covers: [
            "Tweaks to workflow logic \u2014 filing rules, classification thresholds and routing adjusted as your process shifts",
            "Configuration changes driven by platform updates \u2014 when Actionstep or Outlook change, we keep the integration working",
          ],
          options: [
            { id: "stabilise", name: "Stabilisation window \u2014 months 1 to 3 post-handover", amount: 500, per: "month", recommended: true,
              covers: ["Includes 10 hours per month of monitoring and the work above"],
              footnote: "Usage beyond the monthly allocation is bought as a top-up." },
            { id: "topup", name: "Top-ups, based on usage \u2014 month 4 onward", amount: 250, per: "5-hour top-up",
              covers: ["No monthly commitment \u2014 you top up only when you need to, and draw it down as work comes up"] },
          ],
        },
        roadmap: {
          weeks: 6,
          note: "Phase 1 is a 3-week build, about 6 weeks end-to-end once discovery, UAT and handover are included. The workflow audit runs in parallel from day one, so that by the time the build lands we have a jointly agreed automation roadmap and a scoped Phase 2.",
          caveat: "This timeline is preliminary - actual timelines are subject to change.",
          lanes: [
            { id: "discovery", label: "Discovery", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "build", label: "Build \u2014 document management", kind: "build", start_week: 1, end_week: 4 },
            { id: "uat", label: "UAT", kind: "uat", start_week: 4, end_week: 5 },
            { id: "handover", label: "Handover", kind: "golive", start_week: 5, end_week: 6 },
            { id: "audit", label: "Workflow audit (in parallel)", kind: "discovery", start_week: 0, end_week: 4 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 2500, item: "Phase 1 build",
              basis: "Document management via email, filed automatically into Actionstep." },
            { kind: "line", amount: 500, item: "Workflow audit",
              basis: "Core journeys mapped to an agreed automation roadmap. Normally $1,000 \u2014 offered here at a discounted price." },
          ],
          total: { label: "Total Phase 1 investment", amount: 3000 },
          note: "Estimate for the scope on the Phase 1 Deliverable page. Revised from $5,000 to reflect the narrowed Phase 1 scope \u2014 document management only.",
        },
      },
      nodes: [
        { id: "email-in", kind: "trigger", actor: "system", cluster: "inbox", deliverable: "track1",
          label: "Inbound email", stakeholder: ["Outlook"], action: "A document arrives",
          description: "New documents land in Outlook before anyone opens Actionstep. ICL requests and court updates arrive the same way — the work begins in email, outside the case system.",
          confidence: "committed",
          needs: [{ id: "outlook-access", type: "confirm", required: true, prompt: "API access to Outlook for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "Every inbound email is seen", detail: "The decisioning layer listens to all of them." }],
          assumptions: ["Assumes relevant mail arrives at a mailbox we are permitted to watch"] },

        { id: "sender-match", kind: "step", actor: "system", cluster: "match", deliverable: "track1",
          label: "Sender lookup", stakeholder: ["Actionstep"], action: "Match the matter",
          description: "One sender, one matter, filed with no AI involved. If the sender maps to exactly one matter in Actionstep, the document is filed directly — deterministic, no AI needed. Most emails land here.",
          confidence: "committed",
          scenarios: ["one-matter"],
          needs: [{ id: "matter-structure", type: "longtext", required: true, prompt: "How are your matter structures, document types and deliverable fields set up in Actionstep?" }],
          gives: [{ label: "Filed without AI touching it", detail: "" }],
          assumptions: ["Assumes sender addresses are recorded against matters in Actionstep"] },

        { id: "ai-classify", kind: "ai", actor: "ai", cluster: "match", deliverable: "track1",
          label: "AI match", stakeholder: ["AI model", "Actionstep"], action: "Pick the right matter",
          description: "Where a sender maps to several matters, the model picks one. Where the sender maps to more than one matter, the model reviews the email against the matter details and classifies it into the right one.",
          confidence: "committed",
          scenarios: ["multi-matter"],
          needs: [],
          gives: [{ label: "The right matter, with a confidence score", detail: "" }],
          assumptions: ["Assumes matter records carry enough detail to tell them apart"] },

        { id: "poc-check", kind: "hitl", actor: "human_client", cluster: "match", deliverable: "track1",
          label: "POC review", stakeholder: ["Your POC"], action: "A person checks the doubt",
          description: "Below the threshold, a person decides before anything is filed. Below the confidence threshold, it goes to a designated POC for a quick review before filing. Never filed blindly.",
          confidence: "committed",
          scenarios: ["low-confidence"],
          needs: [{ id: "poc-name", type: "contact", required: true, prompt: "Who is the designated POC for the review queue?" }],
          gives: [{ label: "A person adjudicates every uncertain filing", detail: "" }],
          assumptions: ["Assumes a named POC is available to clear the review queue"] },

        { id: "actionstep-file", kind: "artifact", actor: "system", cluster: "file", deliverable: "track1",
          label: "File to matter", stakeholder: ["Actionstep"], action: "Seconds, not 15 steps",
          description: "The document files itself, seconds after it arrived. It lands on the right matter with no steps and no switching — the 15-step round trip through Outlook, Actionstep and the plug-in is gone.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "10–15 minutes becomes seconds", detail: "For a task repeated dozens of times a day." }],
          assumptions: ["Assumes the Actionstep API accepts document filing against a matter"] },

        { id: "actionstep", kind: "system", actor: "system", cluster: "file", deliverable: "track1",
          label: "Actionstep", stakeholder: ["Case management"], action: "Your case system",
          description: "Your case management system stays the source of truth. The plug-in stops being part of the filing path.",
          confidence: "committed",
          needs: [{ id: "actionstep-access", type: "confirm", required: true, prompt: "API access to Actionstep for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "No second system to keep in sync", detail: "" }],
          assumptions: ["Preliminary — the definitive access list is confirmed with your IT lead during discovery week"] },
      ],
      edges: [
        { from: "email-in", to: "sender-match", kind: "triggers" },
        { from: "sender-match", to: "ai-classify", kind: "depends" },
        { from: "ai-classify", to: "poc-check", kind: "depends" },
        { from: "sender-match", to: "actionstep-file", kind: "data" },
        { from: "poc-check", to: "actionstep-file", kind: "data" },
        { from: "actionstep-file", to: "actionstep", kind: "data" },
      ],
      scenarios: [
        { id: "one-matter", label: "Sender maps to one matter" },
        { id: "multi-matter", label: "Sender maps to several" },
        { id: "low-confidence", label: "AI not confident" },
      ],
    },
  },

  // =========================================================================
  // MINERVA LAW — the insight engine, two analyses
  // =========================================================================
  {
    slug: "minerva-law",
    name: "Minerva Law — Phase 1",
    client_name: "Minerva Law",
    client_contact_name: "Tsungai Mukushi",
    pain_points: [
      "The product UI is prototyped and live, but the insight engine underneath it does not exist yet",
      "Franchise agreement and disclosure review is done by hand, per matter",
      "Nothing systematically catches where the agreement and the disclosure document disagree",
    ],
    objectives: [
      "Rate each clause against the Minerva playbook, then escalate it on the client's own Dual Diligence answers",
      "Surface departures from the Franchising Code and inconsistencies between the two documents",
      "Keep a qualified solicitor accountable for the advice while the machine does the heavy lifting",
    ],
    graph: {
      preset: "pipeline",
      headline: "The AI finds the clauses. Your playbook rates them. The client's answers personalise them. Every legal judgement traces back to Minerva.",
      headline_metric: { unit: "topic_areas", amount: 27, basis: "topic areas already analysed in the Minerva playbook today" },
      deliverables: [
        { id: "dl1", label: "Personalised risk", summary: "Each clause rated against the playbook, then escalated on the client's own Dual Diligence answers.", metric: { unit: "weeks", amount: 3, basis: "demoed at Gate 2, end of Week 3" } },
        { id: "dl2", label: "Document analysis", summary: "Two passes — the documents against each other, then against the Code and the playbook.", metric: { unit: "weeks", amount: 7, basis: "demoed at Gate 3, end of Week 7" } },
      ],
      // From `5b_roadmap.html` and `5d_investment.html`.
      sections: {
        roadmap: {
          weeks: 10,
          note: "A ten-week build: a discovery week, then the two engines built and tested one after the other \u2014 personalised risk scoring first, then the document analyser \u2014 with an approval gate at every stage, so you sign off on each piece as it lands, never all at the end.",
          lanes: [
            { id: "discovery", label: "Discovery", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "risk", label: "Personalised Risk Scoring", kind: "build", start_week: 1, end_week: 4 },
            { id: "analyser", label: "Document Analyser", kind: "build", start_week: 4, end_week: 8 },
            { id: "testing", label: "Testing", kind: "uat", start_week: 8, end_week: 9 },
            { id: "handover", label: "Handover", kind: "golive", start_week: 9, end_week: 10 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 8000, item: "Phase 1 insight engine",
              basis: "Personalised risk analysis and document analysis. A fixed-price build \u2014 the engine that lets Minerva productise the offering and carry review volume at scale, with your solicitors reviewing the analysis rather than building it from scratch on every matter." },
          ],
          total: { label: "Total project investment", amount: 8000 },
        },
      },
      nodes: [
        // ---- Deliverable 1 · personalised risk ----
        { id: "dual-diligence", kind: "trigger", actor: "human_client", cluster: "capture", deliverable: "dl1",
          label: "Dual Diligence™", stakeholder: ["Your client"], action: "41 questions, 7 sections",
          description: "Minerva's edge — it already captures the client's actual circumstances. The client works through 41 questions across 7 sections, and those answers are what make the risk report personal to them.",
          confidence: "committed",
          needs: [{ id: "questionnaire-access", type: "confirm", required: true, prompt: "Access to the prototype and the Dual Diligence™ questionnaire to build against", confirm_label: "Yes, we can provide access" }],
          gives: [{ label: "The client's actual circumstances", detail: "Captured once, section by section." }],
          assumptions: ["Assumes the questionnaire is stable enough to map answers to flags"] },

        { id: "extract-clauses", kind: "ai", actor: "ai", cluster: "analyse", deliverable: "dl1",
          label: "Extract clauses", stakeholder: ["AI model"], action: "Map to topic areas",
          description: "Every clause is read and mapped to a topic area. The agreement and disclosure document are read and each clause mapped to a topic area — cooling-off, personal guarantee, restraint of trade, renewal and fees, minimum spend, termination.",
          confidence: "committed",
          needs: [{ id: "sample-docs", type: "file", required: true, prompt: "Sample franchise agreements and disclosure documents to build against" }],
          gives: [{ label: "Every clause, mapped to a topic area", detail: "" }],
          assumptions: ["The AI locates text and looks things up — it makes no legal judgement"] },

        { id: "playbook", kind: "system", actor: "human_client", cluster: "analyse", deliverable: "dl1",
          label: "Playbook", stakeholder: ["Your team"], action: "27 topic areas, rated",
          description: "Your playbook sets the rating; the agent applies it every matter. What Minerva considers low, medium or high across the 27 topic areas, with the reference value behind each classification — applied consistently, every matter.",
          confidence: "committed",
          needs: [{ id: "playbook-codify", type: "confirm", required: true, prompt: "Solicitor support to codify the baseline contract risk across the 27 topic areas, and the reference values behind each", confirm_label: "Yes, a solicitor can be made available" }],
          gives: [{ label: "Consistent ratings, every matter", detail: "Editable by you without engineering." }],
          assumptions: ["This playbook is the shared reference both engines work from"] },

        { id: "risk-flags", kind: "system", actor: "human_client", cluster: "analyse", deliverable: "dl1",
          label: "Risk flags", stakeholder: ["Your team"], action: "What escalates what",
          description: "Your answers decide which clauses escalate, and by how much. Which Dual Diligence™ answers escalate which clauses, and by how much — HOME-AT-RISK, THIN-RESERVES, RUSHED-DECISION, NO-NEGOTIATION.",
          confidence: "committed",
          needs: [{ id: "flags-codify", type: "confirm", required: true, prompt: "Solicitor support to codify the personalised risk flags — which responses escalate which clauses, and by how much", confirm_label: "Yes, a solicitor can be made available" }],
          gives: [{ label: "A clause rating that is personal to the client", detail: "Both tables authored by you, editable without engineering." }],
          assumptions: ["Assumes escalation can be expressed as rules rather than case-by-case judgement"] },

        { id: "personalise", kind: "ai", actor: "ai", cluster: "analyse", deliverable: "dl1",
          label: "Personalise risk", stakeholder: ["AI model"], action: "Medium becomes High",
          description: "A clause rated Medium becomes High for this client, and says why. A clause rated Medium in the playbook becomes High for this client — and the report says why, citing the questionnaire items that triggered it.",
          confidence: "committed",
          needs: [{ id: "ground-truth", type: "file", required: true, prompt: "A sample of real, de-identified past cases with the solicitor's conclusion — the ground truth we refine against" }],
          gives: [{ label: "Personalised commentary per clause", detail: "Traced to the questionnaire answers that caused the escalation." }],
          assumptions: ["Assumes the escalation tables are authored before the engine is built"] },

        { id: "solicitor-risk-review", kind: "hitl", actor: "human_client", cluster: "review", deliverable: "dl1",
          label: "Solicitor review", stakeholder: ["Minerva solicitor"], action: "Tweak or approve",
          description: "Routed to a Minerva solicitor before anything reaches the client. A qualified lawyer stays accountable for the advice.",
          confidence: "committed",
          needs: [{ id: "solicitor-gates", type: "confirm", required: true, prompt: "Solicitor availability at each gate — Weeks 3, 7, 8 and 9 — to review outputs and give feedback", confirm_label: "Yes, we can commit to that" }],
          gives: [{ label: "A human-reviewed report, every time", detail: "" }],
          assumptions: ["Assumes a Minerva solicitor is available to clear reviews at each gate"] },

        // ---- Deliverable 2 · document analysis ----
        { id: "two-docs", kind: "trigger", actor: "human_client", cluster: "capture", deliverable: "dl2",
          label: "Two documents", stakeholder: ["Your client"], action: "Agreement and disclosure",
          description: "Two documents go in: the agreement and the disclosure. Franchise agreement plus disclosure document, with terms extracted clause by clause.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Terms extracted clause by clause", detail: "" }],
          assumptions: ["Assumes both are supplied together and are machine-readable"] },

        { id: "pass-1", kind: "ai", actor: "ai", cluster: "analyse", deliverable: "dl2",
          label: "Pass 1", stakeholder: ["AI model"], action: "Terms against each other",
          description: "The two documents are compared against each other. An AI agent compares the two documents and records where they disagree — a renewal fee of $15,000 in the agreement against $12,500 in the disclosure, a 5km exclusive radius against 3km.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Recorded discrepancies", detail: "Each tied to its clause and disclosure item." }],
          assumptions: ["Assumes equivalent terms can be matched across both documents"] },

        { id: "pass-2", kind: "ai", actor: "ai", cluster: "analyse", deliverable: "dl2",
          label: "Pass 2", stakeholder: ["AI model", "Franchising Code"], action: "Terms against the Code",
          description: "The same terms are checked against the Franchising Code. The same terms are compared against the Franchising Code and the Minerva playbook, with the citation recorded — cooling-off against s.26, restraint of trade against s.23, missing disclosure items against sch.1.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Code departures, with citations", detail: "Each tied to its source and the exact wording." }],
          assumptions: ["Assumes the Code in force at review time is the reference"] },

        { id: "flag-summary", kind: "artifact", actor: "system", cluster: "review", deliverable: "dl2",
          label: "Flag summary", stakeholder: ["Review console"], action: "Grouped by type",
          description: "One list of flagged clauses, grouped by type. A single list of flagged clauses, grouped by type — Code departures and inconsistencies — each tied to its source.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Your team opens each matter with the groundwork done", detail: "" }],
          assumptions: ["Assumes grouping by type matches how your solicitors triage"] },

        { id: "review-console", kind: "hitl", actor: "human_client", cluster: "review", deliverable: "dl2",
          label: "Review console", stakeholder: ["Minerva solicitor"], action: "Refine or approve",
          description: "Flags reach the solicitor by type. Nothing goes to the client without a solicitor passing it.",
          confidence: "committed",
          needs: [{ id: "poc", type: "contact", required: true, prompt: "A dedicated point of contact — ideally with solicitor input — for the stage checkpoints" }],
          gives: [{ label: "A solicitor-ready report", detail: "" }],
          assumptions: ["Assumes solicitors review in the console rather than exporting elsewhere"] },
      ],
      edges: [
        { from: "dual-diligence", to: "risk-flags", kind: "data" },
        { from: "extract-clauses", to: "playbook", kind: "depends" },
        { from: "playbook", to: "personalise", kind: "data" },
        { from: "risk-flags", to: "personalise", kind: "data" },
        { from: "personalise", to: "solicitor-risk-review", kind: "triggers" },
        { from: "two-docs", to: "pass-1", kind: "triggers" },
        { from: "pass-1", to: "pass-2", kind: "depends" },
        { from: "pass-2", to: "flag-summary", kind: "data" },
        { from: "flag-summary", to: "review-console", kind: "triggers" },
      ],
      scenarios: [],
    },
  },

  // =========================================================================
  // ST IVES LAW — intake & will generation
  // =========================================================================
  {
    slug: "st-ives-law",
    name: "St Ives Law — Phase 1",
    client_name: "St Ives Law",
    client_contact_name: null,
    pain_points: [
      "Client details captured over calls, email and paper, then re-entered into Clio by hand",
      "No single structured intake — different information collected each time, context lost between handoffs",
      "Every first-draft will is written from a blank page, even for standard repeatable scenarios",
    ],
    objectives: [
      "Capture intake once, cleanly, and turn it straight into a structured Clio matter and a first-draft will",
      "Build for the two to three client scenarios that make up the majority of will matter volume",
    ],
    graph: {
      preset: "pipeline",
      headline: "Capture intake once, cleanly — and turn it straight into a structured Clio matter and a first-draft will.",
      headline_metric: { unit: "weeks", amount: 8, basis: "eight-week build across Weeks 1–8, after a week of pre-work" },
      deliverables: [
        { id: "main", label: "Intake & will generation", summary: "A single guided intake that branches by scenario, creates the Clio matter, and generates the first-draft will.", metric: null },
      ],
      // From `5b_roadmap.html` and `5d_investment.html`. The two payment rows are
      // the schedule, not extra cost \u2014 they sum to the total above them.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "Your first month already includes up to 4 hours of post-go-live support at no charge. This optional plan covers two areas.",
          covers: [
            "System monitoring \u2014 monitoring intake automations, checking form submissions and data mapping, and troubleshooting any automation failures",
            "Small improvements and changes \u2014 minor workflow tweaks, intake form changes, and adjustments to Will templates",
          ],
          options: [
            { id: "retainer", name: "Monthly maintenance retainer", amount: 500, per: "month",
              covers: [
                "Up to 4 hours included each month",
                "Additional hours exceeding the monthly allocation at $60 / hour",
              ] },
          ],
          caveat: "This add-on covers the existing, delivered features. New features are not included; they are scoped and quoted separately as their own incremental build.",
        },
        roadmap: {
          weeks: 9,
          note: "A week of pre-work followed by an eight-week build (Weeks 1-8), with a client checkpoint at every stage \u2014 so you see and sign off on each piece as it lands, never all at the end. Room for testing, feedback and handover is built into the schedule.",
          lanes: [
            { id: "prework", label: "Pre-Work", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "intake", label: "Intake Form Design", kind: "build", start_week: 1, end_week: 2 },
            { id: "clio", label: "Clio Configuration", kind: "build", start_week: 2, end_week: 4 },
            { id: "docauto", label: "Document Automation Build", kind: "build", start_week: 4, end_week: 6 },
            { id: "testing", label: "Testing & Iteration", kind: "uat", start_week: 6, end_week: 7 },
            { id: "uat", label: "UAT & Fee-Earner Feedback", kind: "uat", start_week: 7, end_week: 8 },
            { id: "golive", label: "Handover & Go-Live", kind: "golive", start_week: 8, end_week: 9 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 3000, item: "Automated intake & first-draft will generation",
              basis: "For the in-scope scenarios. A build like this would typically run around $5,000; focusing this phase on the two to three scenarios that drive the majority of your will volume delivers the same end-to-end automation where it matters most." },
          ],
          total: { label: "Total project investment", amount: 3000, was: 5000 },
          note: "Fixed price for the scope on the Scope of Work page. Paid 50% on kickoff at the start of Week 0 pre-work and 50% on go-live at final UAT sign-off \u2014 $1,500 each. Post-go-live support of up to 4 hours in the first month is included.",
        },
      },
      nodes: [
        { id: "intake-form", kind: "trigger", actor: "human_client", cluster: "intake", deliverable: "main",
          label: "Intake form", stakeholder: ["Your client"], action: "Captured once, cleanly",
          description: "One guided form that branches by scenario. A single guided online intake form that branches by scenario type and captures every field the matter needs — client, executors, beneficiaries, guardians, assets and special clauses.",
          confidence: "committed",
          scenarios: ["single", "couple-together", "couple-separated"],
          needs: [{ id: "intake-fields", type: "longtext", required: true, prompt: "Confirmation of the intake fields each scenario requires (client, executors, beneficiaries, guardians, assets, special clauses)" }],
          gives: [{ label: "Intake captured once, cleanly", detail: "Fields map 1:1 to will template variables and Clio matter fields." }],
          assumptions: ["Web form, single channel — phone and paper intake are out of scope this phase"] },

        { id: "scenario-branch", kind: "gate", actor: "system", cluster: "intake", deliverable: "main",
          label: "Scenario branch", stakeholder: ["Intake form"], action: "Single, or a couple",
          description: "Single client, a couple together, or a couple separated. Single client, a couple taken together as one matter with shared beneficiaries, or a couple separated with distinct executors. The exact set is confirmed during Week 0 pre-work.",
          confidence: "scoped",
          scenarios: ["single", "couple-together", "couple-separated"],
          needs: [{ id: "scenario-set", type: "longtext", required: true, prompt: "Which two to three scenarios make up the majority of your will volume?" }],
          gives: [{ label: "The right branch, every time", detail: "" }],
          assumptions: ["Scenarios are illustrative, drawn from patterns in similar estate-planning practices"] },

        { id: "clio-config", kind: "step", actor: "human_lexops", cluster: "build", deliverable: "main",
          label: "Clio setup", stakeholder: ["Clio", "LexOps"], action: "Matter creation mapped",
          description: "Clio is configured so a submitted intake creates the matter. Clio is configured for the in-scope scenarios so that a submitted intake automatically creates the contact and a correctly structured matter — no re-keying.",
          confidence: "committed",
          needs: [{ id: "clio-access", type: "confirm", required: true, prompt: "Clio administrator access for the assigned LexOps engineers, and a short working session on matter types and field mapping", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "A correctly structured matter", detail: "Consistent setup from day one." }],
          assumptions: ["Assumes Clio matter types can be structured to match the in-scope scenarios"] },

        { id: "will-generation", kind: "ai", actor: "ai", cluster: "build", deliverable: "main",
          label: "Draft will", stakeholder: ["AI model"], action: "Generated per scenario",
          description: "A first-draft will is generated from the captured data. From the captured data, a first-draft will is generated per scenario — the right template with conditional clauses driven by the intake answers.",
          confidence: "committed",
          scenarios: ["single", "couple-together", "couple-separated"],
          needs: [{ id: "will-templates", type: "file", required: true, prompt: "Lawyer-approved will templates for each in-scope scenario — these must exist and be signed off before Week 1" }],
          gives: [{ label: "A draft-ready will for solicitor review", detail: "Not a blank page." }],
          assumptions: ["Executor, beneficiary and guardian linking is handled automatically"] },

        { id: "solicitor-review", kind: "hitl", actor: "human_client", cluster: "review", deliverable: "main",
          label: "Fee-earner review", stakeholder: ["Your team"], action: "A solicitor signs it off",
          description: "The output is a draft-ready will for solicitor review. Gate 3 reviews generated wills against your approved templates across all in-scope scenarios, with a one-week change-request window.",
          confidence: "committed",
          needs: [{ id: "uat-availability", type: "confirm", required: true, prompt: "Fee-earner availability during Week 7 UAT to run real intakes and give feedback", confirm_label: "Yes, we can commit to that" }],
          gives: [{ label: "A reviewed draft", detail: "Your downside is capped at every step." }],
          assumptions: ["Assumes a fee earner reviews every draft before it reaches a client"] },

        { id: "clio", kind: "system", actor: "system", cluster: "review", deliverable: "main",
          label: "Clio", stakeholder: ["Case management"], action: "Your practice system",
          description: "Clio stays the source of truth. The wider Clio build-out — matter migration, other document types and additional matter areas — is out of scope this phase.",
          confidence: "committed",
          needs: [{ id: "poc", type: "contact", required: true, prompt: "A dedicated point of contact for template and intake questions, available for the stage checkpoints" }],
          gives: [{ label: "A structured matter, from day one", detail: "" }],
          assumptions: ["Assumes no migration of existing matters is needed this phase"] },
      ],
      edges: [
        { from: "intake-form", to: "scenario-branch", kind: "triggers" },
        { from: "scenario-branch", to: "clio-config", kind: "depends" },
        { from: "clio-config", to: "will-generation", kind: "data" },
        { from: "will-generation", to: "solicitor-review", kind: "triggers" },
        { from: "solicitor-review", to: "clio", kind: "data" },
      ],
      scenarios: [
        { id: "single", label: "Single client" },
        { id: "couple-together", label: "Couple — together" },
        { id: "couple-separated", label: "Couple — separated" },
      ],
    },
  },

  // =========================================================================
  // LAND LAW — intake & onboarding into LEAP
  // =========================================================================
  {
    slug: "land-law",
    name: "Land Law — Phase 1",
    client_name: "Land Law",
    client_contact_name: null,
    pain_points: [
      "Onboarding captured inconsistently, with no structured flow into LEAP",
      "Prior attempts did not prove the data actually lands in LEAP",
    ],
    objectives: [
      "Capture onboarding once and land a correctly mapped matter in LEAP",
      "Focus on conveyancing, which generates ~75% of expected revenue this year",
    ],
    graph: {
      preset: "pipeline",
      headline: "Conveyancing generates ~75% of expected revenue this year — automating its onboarding is where the effort has the most impact.",
      headline_metric: { unit: "pct_revenue", amount: 75, basis: "share of expected revenue this year from conveyancing" },
      deliverables: [
        { id: "main", label: "Intake & onboarding", summary: "A guided intake that branches by matter type and lands a structured matter in LEAP — proven end to end.", metric: null },
      ],
      // From `5b_roadmap.html` and `5d_investment.html`.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "Following go-live, Land Law may retain LexOps to keep the system running. This plan is entirely optional and covers two areas.",
          covers: [
            "System monitoring \u2014 monitoring intake automations, checking form submissions and LEAP data mapping, and troubleshooting any automation failures",
            "Small improvements and changes \u2014 minor workflow tweaks, intake form changes, and adjustments to LEAP field mapping",
          ],
          options: [
            { id: "retainer", name: "Monthly maintenance retainer", amount: 500, per: "month",
              covers: [
                "Up to 4 hours included each month",
                "Additional hours exceeding the monthly allocation at $60 / hour",
              ] },
          ],
          caveat: "This add-on covers the existing, delivered features. New features are not included; they are scoped and quoted separately as their own incremental build.",
        },
        roadmap: {
          weeks: 7,
          note: "A week of pre-work followed by a six-week build (Weeks 1-6), with a client checkpoint at every stage \u2014 so you see and sign off on each piece as it lands, never all at the end.",
          lanes: [
            { id: "prework", label: "Pre-Work", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "form", label: "Onboarding Form Design", kind: "build", start_week: 1, end_week: 2 },
            { id: "leap", label: "LEAP Config & Field Mapping", kind: "build", start_week: 2, end_week: 4 },
            { id: "e2e", label: "End-to-End Integration & Validation", kind: "build", start_week: 4, end_week: 5 },
            { id: "testing", label: "Testing & Iteration", kind: "uat", start_week: 5, end_week: 6 },
            { id: "golive", label: "UAT, Handover & Go-Live", kind: "golive", start_week: 6, end_week: 7 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 4000, item: "Automated client intake & onboarding into LEAP",
              basis: "For the in-scope matter types. Previous attempts cost time and licence fees without landing the data where it needs to be; this delivers onboarding captured once that actually reaches LEAP, mapped to how your firm stores matter data." },
          ],
          total: { label: "Total project investment", amount: 4000 },
          note: "Fixed price for the scope on the Scope of Work page. Ongoing maintenance is optional.",
        },
      },
      nodes: [
        { id: "onboarding-form", kind: "trigger", actor: "human_client", cluster: "intake", deliverable: "main",
          label: "Onboarding form", stakeholder: ["Your client"], action: "Captured once, cleanly",
          description: "One guided form that branches by matter type. A single guided online intake form that branches by matter type and captures every field onboarding needs — client and party details, property or entity, and engagement specifics.",
          confidence: "committed",
          scenarios: ["purchase", "sale", "commercial"],
          needs: [{ id: "intake-fields", type: "longtext", required: true, prompt: "The intake fields each matter type requires (client, parties, property, finance, settlement details)" }],
          gives: [{ label: "Intake captured once, cleanly", detail: "Fields map 1:1 to LEAP matter fields." }],
          assumptions: ["Assumes clients complete onboarding online rather than by phone or paper"] },

        { id: "matter-type", kind: "gate", actor: "system", cluster: "intake", deliverable: "main",
          label: "Matter type", stakeholder: ["Onboarding form"], action: "Purchase, sale, commercial",
          description: "Residential purchase, residential sale, or a commercial matter. The exact set is confirmed with you during Week 0 pre-work.",
          confidence: "scoped",
          scenarios: ["purchase", "sale", "commercial"],
          needs: [{ id: "matter-types", type: "longtext", required: true, prompt: "Which conveyancing matter types should we build for?" }],
          gives: [{ label: "The right branch, every time", detail: "" }],
          assumptions: ["Matter types are illustrative, drawn from similar conveyancing and commercial practices"] },

        { id: "leap-config", kind: "step", actor: "human_lexops", cluster: "build", deliverable: "main",
          label: "LEAP setup", stakeholder: ["LEAP", "LexOps"], action: "Every field mapped",
          description: "Every intake field is mapped to a LEAP matter field. We configure LEAP and map every intake field to a matter the way your firm structures its data — so a submitted intake creates the contact and a correctly structured matter automatically.",
          confidence: "committed",
          needs: [
            { id: "leap-structure", type: "longtext", required: true, prompt: "How does your firm structure matter data in LEAP — matter types, fields, and the mapping the build relies on?" },
            { id: "leap-access", type: "confirm", required: true, prompt: "LEAP administrator access for the assigned Lex Ops engineers", confirm_label: "Yes, we can arrange that" },
          ],
          gives: [{ label: "No re-keying", detail: "" }],
          assumptions: ["Assumes LEAP admin access and a working session on matter structure"] },

        { id: "validate-e2e", kind: "step", actor: "human_lexops", cluster: "prove", deliverable: "main",
          label: "End-to-end proof", stakeholder: ["LexOps", "LEAP"], action: "Prove the data lands",
          description: "The piece prior attempts missed: we prove the data actually lands. Each in-scope matter type is run form → LEAP contact & matter created & documents attached, and validated.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Onboarding that reliably settles into LEAP", detail: "Proven, not assumed." }],
          assumptions: ["Assumes each in-scope matter type can be run end to end before go-live"] },

        { id: "uat", kind: "hitl", actor: "human_client", cluster: "prove", deliverable: "main",
          label: "UAT sign-off", stakeholder: ["Your team"], action: "You accept, then go live",
          description: "Your team runs real intakes before go-live. Your team runs real or simulated intakes end-to-end and confirms the data reliably lands in LEAP the way your firm structures it, before go-live.",
          confidence: "committed",
          needs: [
            { id: "uat-availability", type: "confirm", required: true, prompt: "Fee-earner availability during Week 6 UAT to run real intakes and give feedback", confirm_label: "Yes, we can commit to that" },
            { id: "poc", type: "contact", required: true, prompt: "A dedicated point of contact for intake and matter-structure questions" },
          ],
          gives: [{ label: "A go/no-go you control", detail: "Your downside is capped at every step." }],
          assumptions: ["Assumes fee earners are available during the UAT week"] },

        { id: "leap", kind: "system", actor: "system", cluster: "prove", deliverable: "main",
          label: "LEAP", stakeholder: ["Case management"], action: "Your practice system",
          description: "LEAP stays the source of truth. Matter types beyond those confirmed, and the wider LEAP build-out, are out of scope this phase.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "A correctly structured matter", detail: "" }],
          assumptions: ["Assumes matter types beyond those confirmed stay out of scope"] },
      ],
      edges: [
        { from: "onboarding-form", to: "matter-type", kind: "triggers" },
        { from: "matter-type", to: "leap-config", kind: "depends" },
        { from: "leap-config", to: "validate-e2e", kind: "data" },
        { from: "validate-e2e", to: "uat", kind: "triggers" },
        { from: "uat", to: "leap", kind: "data" },
      ],
      scenarios: [
        { id: "purchase", label: "Conveyance — purchase" },
        { id: "sale", label: "Conveyance — sale" },
        { id: "commercial", label: "Commercial matter" },
      ],
    },
  },

  // =========================================================================
  // NAUTILUS LAW — intake & Smokeball automation
  // =========================================================================
  {
    slug: "nautilus-law-v3",
    name: "Nautilus Law — Intake Processes",
    client_name: "Nautilus Law",
    client_contact_name: null,
    pain_points: [
      "Inconsistent intake capture across phone, meetings and forms",
      "No single structured data flow into Smokeball; manual, error-prone matter creation",
      "Unpaid advisory time before engagement, and slow quote turnaround",
    ],
    objectives: [
      "Put a consistent intake structure in place across all channels",
      "Configure Smokeball for automated, structured matter setup",
      "Generate advice letters and fee estimates from intake classification",
    ],
    graph: {
      preset: "pipeline",
      headline: "One structured intake across phone, meetings and forms — then the documents that follow it write themselves.",
      headline_metric: { unit: "matter_categories", amount: 6, basis: "5–6 defined matter categories all three channels feed into" },
      deliverables: [
        { id: "main", label: "Intake & Smokeball automation", summary: "Unified intake, structured matter creation, and generated advice letters and quotes.", metric: null },
      ],
      // From `6_scope_of_work.html`. **No roadmap block on purpose** \u2014 this
      // proposal states no timeline anywhere, so Act III says the build duration
      // isn't set rather than inventing weeks to draw.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "Following implementation, Nautilus Law may elect to retain LexOps on an ongoing basis. This plan covers two areas.",
          covers: [
            "System monitoring \u2014 monitoring intake automations, checking form submissions and data mapping, and troubleshooting any automation failures",
            "Small improvements and changes \u2014 minor workflow tweaks, intake form changes, adjustments to advice letter templates, and small process optimisations",
          ],
          options: [
            { id: "retainer", name: "Monthly maintenance retainer", amount: 500, per: "month",
              covers: [
                "4 to 8 hours included each month",
                "Additional hours exceeding the monthly allocation at $60 / hour",
              ] },
          ],
          caveat: "A full description of the terms and conditions governing this maintenance is set out in the Terms and Conditions document provided separately.",
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 4500, item: "Intake & Smokeball automation",
              basis: "Unified intake across phone, meetings and forms; structured matter creation in Smokeball; generated advice letters and fee estimates." },
          ],
          total: { label: "Total project investment", amount: 4500 },
        },
      },
      nodes: [
        { id: "channels", kind: "trigger", actor: "human_client", cluster: "intake", deliverable: "main",
          label: "New enquiry", stakeholder: ["Phone", "Meetings", "Web form"], action: "Phone, meetings, forms",
          description: "Enquiries arrive by phone, in meetings, and through forms. New matter enquiries arrive across inbound phone calls, client meetings and web-based intake forms. Today each is captured manually and inconsistently.",
          confidence: "committed",
          scenarios: ["phone", "meeting", "web-form"],
          needs: [{ id: "channel-volumes", type: "longtext", required: true, prompt: "Roughly what share of enquiries arrives by phone, by meeting, and by web form?" }],
          gives: [{ label: "Consistent capture regardless of source", detail: "" }],
          assumptions: ["Assumes all three channels can feed one structured capture"] },

        { id: "classification", kind: "step", actor: "system", cluster: "intake", deliverable: "main",
          label: "Classification", stakeholder: ["Smokeball"], action: "Into 5–6 categories",
          description: "Every enquiry lands in one of five or six defined categories. All three channels feed into a single structured data flow consisting of 5–6 defined matter categories, mapped directly into Smokeball.",
          confidence: "committed",
          needs: [{ id: "matter-categories", type: "longtext", required: true, prompt: "Which 5–6 matter categories should intake classify into?" }],
          gives: [{ label: "Category-based classification logic", detail: "" }],
          assumptions: ["Assumes the category set is agreed before build and changes rarely"] },

        { id: "smokeball-config", kind: "step", actor: "human_lexops", cluster: "build", deliverable: "main",
          label: "Smokeball setup", stakeholder: ["Smokeball", "LexOps"], action: "Matters built on intake",
          description: "Smokeball creates and structures the matter from the intake. Smokeball is configured to automatically create and structure matters based on intake classification, ensuring correct matter setup and data consistency from day one.",
          confidence: "committed",
          needs: [{ id: "smokeball-access", type: "confirm", required: true, prompt: "Smokeball administrator access for the assigned engineers", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "Structured matter creation", detail: "" }],
          assumptions: ["Assumes Smokeball admin access and a fixed template per category"] },

        { id: "advice-letter", kind: "ai", actor: "ai", cluster: "documents", deliverable: "main",
          label: "Advice letter", stakeholder: ["AI model", "Smokeball"], action: "Pre-populated from intake",
          description: "The letter is pre-populated from the intake. A structured letter pre-populated from intake data — client and matter details, matter classification, scope of advice, key terms, and recommended next steps.",
          confidence: "committed",
          needs: [{ id: "letter-templates", type: "file", required: true, prompt: "Your current engagement and advice letter templates" }],
          gives: [{ label: "Ready for review and send-off", detail: "Fee earners review and send rather than draft from scratch." }],
          assumptions: ["Generated within Smokeball using controlled templates"] },

        { id: "fee-estimate", kind: "ai", actor: "ai", cluster: "documents", deliverable: "main",
          label: "Fee estimate", stakeholder: ["AI model", "Smokeball"], action: "Priced by category",
          description: "A fee estimate priced against the matter category. A consistent fee estimate mapped to the matter category, setting out estimated fees, what is included, assumptions, and validity.",
          confidence: "committed",
          needs: [{ id: "fee-ranges", type: "longtext", required: true, prompt: "The fee ranges and inclusions for each matter category" }],
          gives: [{ label: "A fast, standardised quote", detail: "Valid for 30 days." }],
          assumptions: ["Assumes fee ranges per category can be agreed and held stable"] },

        { id: "fee-earner", kind: "hitl", actor: "human_client", cluster: "documents", deliverable: "main",
          label: "Fee-earner review", stakeholder: ["Your team"], action: "Review, then send",
          description: "A fee earner reviews and sends, rather than drafting. Draft-ready documents are produced for review — reducing manual drafting time and improving consistency across matters.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Less unpaid advisory time", detail: "And faster quote turnaround." }],
          assumptions: ["Assumes nothing reaches a client without that review"] },

        { id: "smokeball", kind: "system", actor: "system", cluster: "documents", deliverable: "main",
          label: "Smokeball", stakeholder: ["Case management"], action: "Your practice system",
          description: "The case management system stays the source of truth. Documents are generated directly within it.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "One structured flow into Smokeball", detail: "" }],
          assumptions: ["Assumes Smokeball remains the system of record"] },
      ],
      edges: [
        { from: "channels", to: "classification", kind: "triggers" },
        { from: "classification", to: "smokeball-config", kind: "depends" },
        { from: "smokeball-config", to: "advice-letter", kind: "data" },
        { from: "smokeball-config", to: "fee-estimate", kind: "data" },
        { from: "advice-letter", to: "fee-earner", kind: "triggers" },
        { from: "fee-estimate", to: "fee-earner", kind: "triggers" },
        { from: "fee-earner", to: "smokeball", kind: "data" },
      ],
      scenarios: [
        { id: "phone", label: "Inbound phone call" },
        { id: "meeting", label: "Client meeting" },
        { id: "web-form", label: "Web intake form" },
      ],
    },
  },

  // =========================================================================
  // FOYLE LEGAL — an API integration, not a workflow. Topology preset.
  // =========================================================================
  {
    slug: "foyle-legal",
    name: "Foyle Legal — Actionstep API Integration",
    client_name: "Foyle Legal",
    client_contact_name: "Ida Ma",
    pain_points: [
      "No working API connection into Actionstep to build custom workflows against",
      "Zapier's Actionstep connector is a curated menu that exposes a fraction of the API",
      "The gaps are exactly where the more ambitious workflows stall",
    ],
    objectives: [
      "Stand up an authenticated, correctly-mapped n8n connection into Actionstep",
      "Get the essential CRUD operations working against the live schema",
      "Hand over documentation and videos so Foyle can extend it themselves",
    ],
    graph: {
      preset: "topology",
      headline: "The pipes and the plumbing are ours to lay. The workflows you build on top are then yours.",
      headline_metric: { unit: "resources", amount: 3, basis: "matters, participants and documents — full CRUD on each" },
      deliverables: [
        { id: "main", label: "n8n integration", summary: "An authenticated connection and dependable core operations you can build on.", metric: null },
      ],
      // From `3_roadmap.html` and `5_investment.html`.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "This plan is entirely optional. Because documentation and short videos are part of the build, you can extend and maintain the integration yourself. Two ways to structure it if you would rather we stayed on.",
          covers: [
            "Tweaks to the reusable workflows \u2014 schema mapping and the CRUD operations adjusted as your Actionstep setup shifts",
            "Configuration changes driven by platform updates \u2014 when Actionstep or n8n change, we keep the integration working",
          ],
          options: [
            { id: "stabilise", name: "Option 1 \u2014 stabilisation retainer", amount: 350, per: "month", recommended: true,
              covers: [
                "n8n platform cost",
                "Lex Ops maintenance charge \u2014 5-hour block",
                "We maintain the platform and make changes based on your case management schema",
              ],
              footnote: "Recommended, at least for the first three months." },
            { id: "ondemand", name: "Option 2 \u2014 support as needed", amount: 100, per: "2-hour block",
              covers: [
                "We come in to do maintenance as needed",
                "Platform costs handed to you",
              ] },
          ],
        },
        roadmap: {
          weeks: 4,
          note: "A four-week container \u2014 Week 0 pre-work followed by a three-week build. The hands-on effort is modest; the calendar is paced mainly by how quickly Actionstep issues API credentials.",
          lanes: [
            { id: "creds", label: "Credentials & Scope Sign-Off", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "api", label: "API Integration & Schema Study", kind: "build", start_week: 1, end_week: 2 },
            { id: "core", label: "Core Workflows Build", kind: "build", start_week: 2, end_week: 3 },
            { id: "uat", label: "UAT Testing & Handover", kind: "golive", start_week: 3, end_week: 4 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 2500, item: "n8n integration",
              basis: "Authenticated Actionstep connection, core CRUD workflows on matters, participants and documents, plus documentation and short videos so you can build on it yourself." },
          ],
          total: { label: "Total project investment", amount: 2500 },
          note: "Fixed price for the scope on the Scope of This Proposal page. Ongoing maintenance is optional.",
        },
      },
      nodes: [
        { id: "n8n", kind: "system", actor: "system", cluster: "platform", deliverable: "main",
          label: "n8n", stakeholder: ["Automation platform"], action: "Direct REST, not Zapier",
          description: "We build on n8n, calling Actionstep's REST endpoints directly. We build on n8n rather than Zapier, calling Actionstep's REST endpoints directly — so you get the full reach of the API, any resource, any method, rather than a fixed list of pre-built actions.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Reusable building blocks, not one-offs", detail: "A toolkit you can keep building on." }],
          assumptions: ["Assumes n8n remains your automation platform"] },

        { id: "actionstep", kind: "system", actor: "system", cluster: "platform", deliverable: "main",
          label: "Actionstep", stakeholder: ["Case management"], action: "Your case system",
          description: "Your case management system. The integration is shaped to your firm's schema, not to a generic one.",
          confidence: "committed",
          needs: [{ id: "actionstep-admin", type: "confirm", required: true, prompt: "Administrator-level access to live Actionstep for the assigned Lex Ops engineers", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "The full reach of the API", detail: "" }],
          assumptions: ["Assumes Actionstep exposes the endpoints these workflows rely on"] },

        { id: "oauth", kind: "step", actor: "human_lexops", cluster: "auth", deliverable: "main",
          label: "OAuth setup", stakeholder: ["Actionstep", "LexOps"], action: "Once, then never again",
          description: "A one-time setup, after which every call is authorised. We work with Actionstep to obtain the Client ID and Secret, then run the one-time verification and authorisation process.",
          confidence: "committed",
          needs: [{ id: "credentials-auth", type: "confirm", required: true, prompt: "Authorisation to raise the Client ID and Secret request with Actionstep's support team on the firm's behalf", confirm_label: "Yes, you have our go-ahead" }],
          gives: [{ label: "Every call authorised", detail: "" }],
          assumptions: ["Assumes Actionstep support issues credentials without undue delay"] },

        { id: "token-refresh", kind: "step", actor: "system", cluster: "auth", deliverable: "main",
          label: "Token refresh", stakeholder: ["n8n"], action: "Stays connected",
          description: "Tokens renew themselves, so the connection stays live. The n8n architecture is set up so access and refresh tokens renew automatically and the connection stays live without manual re-authentication.",
          confidence: "committed",
          needs: [{ id: "auth-user", type: "text", required: false, prompt: "Is there a preferred authorising user for the connection?" }],
          gives: [{ label: "A connection that stays connected", detail: "" }],
          assumptions: ["Assumes the authorising user's account stays active"] },

        { id: "schema-study", kind: "step", actor: "human_lexops", cluster: "schema", deliverable: "main",
          label: "Schema study", stakeholder: ["LexOps", "Actionstep"], action: "Shaped to your fields",
          description: "We shape the integration to your schema, not a generic one. We study your case management schema — matter types, participant roles, fields and their internal IDs — and structure the messaging to match it.",
          confidence: "committed",
          needs: [{ id: "case-structure", type: "longtext", required: true, prompt: "How does your firm structure its matters, participant roles and documents in Actionstep?" }],
          gives: [{ label: "Operations that land in the right place", detail: "" }],
          assumptions: ["Assumes your matter and participant structures are stable during the build"] },

        { id: "crud-matters", kind: "step", actor: "system", cluster: "operations", deliverable: "main",
          label: "Matters", stakeholder: ["n8n", "Actionstep"], action: "Full CRUD, validated",
          description: "Full create, read, update and delete on matters. Create, read, update and delete matters, validated against your live schema.",
          confidence: "committed",
          needs: [{ id: "priority-types", type: "text", required: false, prompt: "Any specific matter types to prioritise for testing?" }],
          gives: [{ label: "Dependable matter operations", detail: "" }],
          assumptions: ["Assumes matter creation rules are consistent across matter types"] },

        { id: "crud-participants", kind: "step", actor: "system", cluster: "operations", deliverable: "main",
          label: "Participants", stakeholder: ["n8n", "Actionstep"], action: "Full CRUD, validated",
          description: "Full create, read, update and delete on participants. Create, read, update and delete participants, validated against your live schema.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Dependable participant operations", detail: "" }],
          assumptions: ["Assumes participant roles are defined consistently"] },

        { id: "crud-documents", kind: "step", actor: "system", cluster: "operations", deliverable: "main",
          label: "Documents", stakeholder: ["n8n", "Actionstep"], action: "Full CRUD, on matters",
          description: "Full create, read, update and delete on documents. Create, read, update and delete documents on matters, validated against your live schema.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Dependable document operations", detail: "" }],
          assumptions: ["Out of scope: workflows requiring an endpoint Actionstep does not expose, and scheduled or agentic processes with no clean trigger"] },

        { id: "handover", kind: "artifact", actor: "human_lexops", cluster: "handover", deliverable: "main",
          label: "Handover", stakeholder: ["LexOps", "Your team"], action: "Docs and short videos",
          description: "You get documentation and short videos, and own what we built. Detailed documentation of the n8n integration and its workflows, plus short videos you can download and follow to extend the integration yourself.",
          confidence: "committed",
          needs: [{ id: "checkpoint-time", type: "confirm", required: true, prompt: "Short working sessions at the scope sign-off and UAT gates", confirm_label: "Yes, we can commit to that" }],
          gives: [{ label: "You can build on and own what we deliver", detail: "" }],
          assumptions: ["Assumes someone on your team is comfortable editing n8n workflows"] },
      ],
      edges: [
        { from: "oauth", to: "actionstep", kind: "depends" },
        { from: "oauth", to: "token-refresh", kind: "triggers" },
        { from: "token-refresh", to: "n8n", kind: "data" },
        { from: "schema-study", to: "crud-matters", kind: "depends" },
        { from: "schema-study", to: "crud-participants", kind: "depends" },
        { from: "schema-study", to: "crud-documents", kind: "depends" },
        { from: "n8n", to: "crud-matters", kind: "data" },
        { from: "crud-matters", to: "handover", kind: "data" },
        { from: "crud-participants", to: "handover", kind: "data" },
        { from: "crud-documents", to: "handover", kind: "data" },
      ],
      scenarios: [],
    },
  },

  // =========================================================================
  // DZIURA COMPLIANCE — clause retrieval & risk scoring
  // =========================================================================
  {
    slug: "dziura-compliance-consulting",
    name: "Dziura Compliance — Private Compliance Review Automation",
    client_name: "Dziura Compliance Consulting",
    client_contact_name: "Michael Dziura",
    pain_points: [
      "Roughly 32 documents per adviser, 25 per sub-adviser, read by hand every review",
      "The majority of steps are information retrieval and discrepancy checks before any judgement begins",
      "Every manual re-key is a chance for an error to slip into a compliance file",
      "The burden repeats in full for every adviser — there is no leverage",
    ],
    objectives: [
      "Compress the standardised part of the review so the firm's expertise lands where it matters",
      "End in a sourced, risk-ranked memo ready for the due-diligence review",
      "Keep a human in the loop at every key checkpoint",
    ],
    graph: {
      preset: "pipeline",
      headline: "The review is standardised and recurring; the judgement on top of it is bespoke. This compresses the standardised part.",
      headline_metric: { unit: "documents", amount: 32, basis: "documents in an adviser's standard submission set (25 for a sub-adviser)" },
      deliverables: [
        { id: "main", label: "Review pipeline", summary: "Clause retrieval, source-of-truth checking, risk verdict and memo generation, run per adviser.", metric: null },
      ],
      // From `3_roadmap.html` and `5_investment.html`.
      //
      // **USD, not AUD.** The only proposal in the suite priced in dollars that
      // aren't Australian. The currency travels with the figures rather than
      // being assumed by the page, so it can never be relabelled downstream.
      //
      // Lanes overlap deliberately: these are parallel workstreams and the
      // Gantt in the proposal draws them overlapping too.
      sections: {
        maintenance: {
          currency: "USD",
          // Not flagged optional: this page is headed "Maintenance Plan", where
          // the other seven are headed "Optional - Maintenance Plan". For this
          // engine, staying *correct* through model migrations and ruling
          // changes is not a nice-to-have, and the page says so.
          optional: false,
          note: "Once the engine is live it needs to stay correct, not just stay running. Forced AWS model migrations and changes to SEC rulings both require revalidation \u2014 re-proving the risk scores still come out right. The platform cost below is billed at cost with no margin applied.",
          covers: [
            "Pipeline monitoring, failed-run detection and incident response",
            "Dependency, security and AWS runtime updates",
            "Model version migration and post-change revalidation",
            "Risk map and rule library updates as rulings change",
            "Retrieval tuning as adviser document formats drift",
            "Small workflow adjustments requested by your associates",
          ],
          options: [
            { id: "managed", name: "Option A \u2014 fully managed", amount: 500, per: "month", recommended: true,
              covers: [
                "Platform, fixed infrastructure \u2014 $150",
                "Platform, variable at around 8 reviews \u2014 $100",
                "Lex Ops maintenance, 10-hour block \u2014 $250",
                "We run the platform and the engine end to end",
              ],
              footnote: "Totals $500 per month." },
            { id: "support", name: "Option B \u2014 support only", amount: 125, per: "5-hour block",
              covers: [
                "Platform costs handed to you",
                "Lex Ops support as needed",
                "You hold the AWS account and its costs directly",
              ] },
          ],
          caveat: "These figures are current estimates, and platform costs are always passed through at cost with no margin applied. A 10-hour block per month suits the first months, when changes are more frequent, moving to 5-hour top-ups thereafter as the system settles.",
        },
        roadmap: {
          weeks: 12,
          note: "A twelve-week container \u2014 Week 0 mobilisation, a nine-week build, Week 10 for user acceptance testing and Week 11 for handover. Client checkpoints are formal sign-off moments; WIP sessions are short working reviews to keep the build aligned between them.",
          lanes: [
            { id: "mobilise", label: "Mobilisation & Scope", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "env", label: "Private Environment Set-Up", kind: "build", start_week: 1, end_week: 4 },
            { id: "ingest", label: "Ingestion & Clause Retrieval", kind: "build", start_week: 2, end_week: 6 },
            { id: "scoring", label: "Scoring & Memo Engine", kind: "build", start_week: 5, end_week: 9 },
            { id: "assoc", label: "Associate Application", kind: "build", start_week: 7, end_week: 10 },
            { id: "uat", label: "UAT Testing", kind: "uat", start_week: 10, end_week: 11 },
            { id: "handover", label: "Handover", kind: "golive", start_week: 11, end_week: 12 },
          ],
        },
        costing: {
          currency: "USD",
          rows: [
            { kind: "line", amount: 12000, item: "Due diligence review engine",
              basis: "Private cloud environment, clause retrieval with citations, deterministic risk scoring, associate application and memo generation." },
            { kind: "discount", amount: -2000, item: "Introductory partnership discount", basis: "" },
          ],
          total: { label: "Total project investment", amount: 10000, was: 12000 },
          note: "A fixed-price build, priced on the engineering effort, delivered with documentation and walkthrough videos.",
        },
      },
      nodes: [
        { id: "submission", kind: "trigger", actor: "human_client", cluster: "intake", deliverable: "main",
          label: "Submission", stakeholder: ["The adviser"], action: "32 documents and a DDQ",
          description: "Documents and the adviser questionnaire arrive together. Documents plus the adviser questionnaire are submitted and document status is marked. Roughly 32 documents for an adviser, 25 for a sub-adviser.",
          confidence: "committed",
          scenarios: ["adviser", "sub-adviser"],
          needs: [{ id: "past-sets", type: "file", required: true, prompt: "Past adviser document sets, their adviser DDQs and the matching completed internal DDQs — ideally ten complete sets" }],
          gives: [{ label: "A submission the pipeline can work from", detail: "" }],
          assumptions: ["Assumes submissions are complete before review begins"] },

        { id: "clause-retrieval", kind: "ai", actor: "ai", cluster: "retrieve", deliverable: "main",
          label: "Clause retrieval", stakeholder: ["AI model"], action: "Cited to the page",
          description: "Every answer is traced to a clause, a page and a section. For each question in the internal DDQ, the pipeline retrieves the relevant clause from the adviser's document set and captures its citation — the exact document, page and section.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Every downstream answer traceable to its source", detail: "" }],
          assumptions: ["Assumes documents are machine-readable rather than scans"] },

        { id: "prior-year", kind: "system", actor: "system", cluster: "retrieve", deliverable: "main",
          label: "Prior-year DDQ", stakeholder: ["Your records"], action: "Last year, side by side",
          description: "Last year's answer sits beside this year's. Last year's internal DDQ is surfaced alongside the current item, so nothing already answered is re-asked and year-on-year changes are visible.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Year-on-year movement, visible", detail: "" }],
          assumptions: ["The completed internal DDQs supplied become the prior-year responses the engine surfaces"] },

        { id: "source-of-truth", kind: "step", actor: "system", cluster: "reconcile", deliverable: "main",
          label: "Source of truth", stakeholder: ["Internal DDQ"], action: "Response against document",
          description: "The adviser's answer is checked against the document. The adviser's self-reported DDQ response is compared against the retrieved document clause. Where they agree, the item passes through.",
          confidence: "committed",
          scenarios: ["agrees"],
          needs: [],
          gives: [{ label: "Agreeing items pass through", detail: "Without an associate touching them." }],
          assumptions: ["Assumes the document governs where the two disagree"] },

        { id: "adjudicate", kind: "hitl", actor: "human_client", cluster: "reconcile", deliverable: "main",
          label: "Associate review", stakeholder: ["Your associate"], action: "Where the two diverge",
          description: "Where the two disagree, an associate decides. Where the response and the document diverge, the discrepancy is flagged for an associate — presented alongside last year's response.",
          confidence: "committed",
          scenarios: ["diverges"],
          needs: [{ id: "associates-call", type: "confirm", required: true, prompt: "A Week 0 session with the associates who actually run the review — including the judgement calls that never made it into a template", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "A human decides where the documents disagree", detail: "" }],
          assumptions: ["Assumes associates are available to clear discrepancies during review"] },

        { id: "risk-verdict", kind: "ai", actor: "ai", cluster: "assess", deliverable: "main",
          label: "Risk verdict", stakeholder: ["AI model", "SEC ruling"], action: "Proposed, with evidence",
          description: "A verdict is proposed against the applicable ruling. The confirmed source of truth is assessed against the applicable SEC ruling, and a proposed verdict is put forward with its supporting evidence — ready for associate review, not decided in a black box.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "A proposed verdict, with its evidence", detail: "" }],
          assumptions: ["Data is never exposed to, or used to train, LLMs — processing runs through private endpoints with no-training, no-retention guarantees"] },

        { id: "risk-scoring", kind: "step", actor: "system", cluster: "assess", deliverable: "main",
          label: "Risk scoring", stakeholder: ["Your rubric"], action: "A fixed lookup",
          description: "The score is a fixed lookup, not a judgement call. Once a verdict is confirmed, the fixed risk map assigns the score — a straight, reproducible lookup, so ratings are consistent and defensible every time.",
          confidence: "committed",
          needs: [{ id: "risk-map", type: "file", required: true, prompt: "The completed scoring rubric — every internal-DDQ question mapped to its response options, risk score and rating. The build cannot start against an incomplete map." }],
          gives: [{ label: "Consistent, defensible ratings", detail: "" }],
          assumptions: ["Critical dependency — this is what the engine encodes"] },

        { id: "memo", kind: "artifact", actor: "system", cluster: "output", deliverable: "main",
          label: "Risk memo", stakeholder: ["Your team"], action: "Sourced, risk-ranked",
          description: "Everything assembles into a sourced, risk-ranked memo. Approved answers, citations and scores assembled into a memo — an overall and category-wise risk profile with high-risk items surfaced, every point sourced, and each rating shown against last year's.",
          confidence: "committed",
          needs: [{ id: "poc", type: "contact", required: true, prompt: "A dedicated point of contact we present progress to at each checkpoint" }],
          gives: [{ label: "Ready to take into the due-diligence review", detail: "Movement visible at a glance." }],
          assumptions: ["Assumes one memo format works across advisers and sub-advisers"] },

        { id: "private-env", kind: "system", actor: "system", cluster: "output", deliverable: "main",
          label: "Secure storage", stakeholder: ["AWS", "Dziura only"], action: "Encrypted, access-controlled",
          description: "Your documents sit in an environment dedicated to you. Adviser documents live in a private, access-controlled, encrypted environment dedicated to Dziura Compliance Consulting.",
          confidence: "committed",
          needs: [{ id: "tech-discovery", type: "confirm", required: true, prompt: "A Week 0 session with your technical contact on document storage, SharePoint structure, identity and access, and security requirements", confirm_label: "Yes, we can arrange that" }],
          gives: [{ label: "Client data stored securely", detail: "" }],
          assumptions: ["Assumes your security requirements can be met in a private cloud tenancy"] },
      ],
      edges: [
        { from: "submission", to: "clause-retrieval", kind: "triggers" },
        { from: "clause-retrieval", to: "source-of-truth", kind: "data" },
        { from: "prior-year", to: "source-of-truth", kind: "data" },
        { from: "source-of-truth", to: "adjudicate", kind: "depends" },
        { from: "source-of-truth", to: "risk-verdict", kind: "data" },
        { from: "adjudicate", to: "risk-verdict", kind: "data" },
        { from: "risk-verdict", to: "risk-scoring", kind: "depends" },
        { from: "risk-scoring", to: "memo", kind: "data" },
        { from: "memo", to: "private-env", kind: "data" },
      ],
      scenarios: [
        { id: "adviser", label: "Adviser (32 docs)" },
        { id: "sub-adviser", label: "Sub-adviser (25 docs)" },
        { id: "agrees", label: "Response matches the document" },
        { id: "diverges", label: "Response and document diverge" },
      ],
    },
  },

  // =========================================================================
  // ENABLE COLLEGE — two systems, one middle layer
  // =========================================================================
  {
    slug: "enable-college",
    name: "Enable College — Phase 1",
    client_name: "Enable College",
    client_contact_name: null,
    pain_points: [
      "Student information split across aXcelerate and Moodle — no single source of truth",
      "Retrieving and updating records across both platforms is entirely manual",
      "Assessment requires manual trainer assignment and repeated cross-platform hand-offs",
    ],
    objectives: [
      "Enter students, assign classes and record results once, not twice",
      "See completion status for every student at a glance",
      "Process a whole intake from one spreadsheet",
    ],
    graph: {
      preset: "topology",
      headline: "Enter students, assign classes, record results — once, not twice. Every update lands in both systems.",
      headline_metric: { unit: "systems", amount: 2, basis: "aXcelerate and Moodle, kept in two-way sync" },
      deliverables: [
        { id: "main", label: "Month 1", summary: "A middle data layer, a completion reporting dashboard, and bulk upload.", metric: { unit: "weeks", amount: 4, basis: "Month 1 of an incremental build" } },
      ],
      // From `3c_month_1_milestone_plan.html` and `4b_month_1_requirements.html`.
      // Month 1 of an incremental build, so these are the month's figures, not
      // a whole engagement's.
      sections: {
        maintenance: {
          currency: "AUD",
          optional: true,
          note: "Following implementation, Enable College may elect to retain LexOps on an ongoing basis. This plan covers two areas.",
          covers: [
            "System monitoring \u2014 monitoring the aXcelerate and Moodle sync, checking data mapping and reconciliation, and troubleshooting any automation failures",
            "Small improvements and changes \u2014 minor workflow tweaks, dashboard and reporting changes, adjustments to assessment-marking rules, and small process optimisations",
          ],
          options: [
            { id: "retainer", name: "Monthly maintenance retainer", amount: 500, per: "month",
              covers: [
                "8 hours included each month",
                "Additional hours exceeding the monthly allocation at $60 / hour",
              ] },
          ],
          caveat: "A full description of the terms and conditions governing this maintenance is set out in the Terms and Conditions document provided separately.",
        },
        roadmap: {
          weeks: 6,
          note: "How Month 1 comes together \u2014 from access and information transfer through build, testing and acceptance. Changes are made during Week 4 and for one week after; the next month's feature set is scoped during UAT.",
          lanes: [
            { id: "access", label: "Access & Information Transfer", kind: "discovery", start_week: 0, end_week: 1 },
            { id: "build", label: "Build Phase", kind: "build", start_week: 1, end_week: 4 },
            { id: "uat", label: "UAT & Change Window", kind: "uat", start_week: 4, end_week: 6 },
          ],
        },
        costing: {
          currency: "AUD",
          rows: [
            { kind: "line", amount: 3000, item: "Month 1 \u2014 middle data layer, reporting dashboard, bulk upload",
              basis: "Two-way sync between aXcelerate and Moodle, completion reporting, and whole-intake spreadsheet upload." },
          ],
          total: { label: "Total Month 1 investment", amount: 3000 },
        },
      },
      nodes: [
        { id: "axcelerate", kind: "system", actor: "system", cluster: "systems", deliverable: "main",
          label: "aXcelerate", stakeholder: ["Student records"], action: "One of the two systems",
          description: "One of the two systems student information is split across today.",
          confidence: "committed",
          needs: [{ id: "axcelerate-api", type: "confirm", required: true, prompt: "API access to aXcelerate for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "Student and course records", detail: "" }],
          assumptions: ["Assumes aXcelerate's API exposes the student and course fields needed"] },

        { id: "moodle", kind: "system", actor: "system", cluster: "systems", deliverable: "main",
          label: "Moodle", stakeholder: ["Course progress"], action: "The other",
          description: "Course progress and module scores live here. The other of the two systems student information is split across today.",
          confidence: "committed",
          needs: [{ id: "moodle-api", type: "confirm", required: true, prompt: "API access to Moodle for the assigned AI engineers", confirm_label: "Yes, IT can arrange this" }],
          gives: [{ label: "Live module scores", detail: "" }],
          assumptions: ["Assumes Moodle's API exposes module scores and course progress"] },

        { id: "middle-layer", kind: "step", actor: "system", cluster: "layer", deliverable: "main",
          label: "Middle layer", stakeholder: ["aXcelerate", "Moodle"], action: "Two-way sync",
          description: "A two-way sync between aXcelerate and Moodle. Enter students, assign classes, record results once — every update lands in both systems, with no double handling.",
          confidence: "committed",
          needs: [{ id: "field-definitions", type: "longtext", required: true, prompt: "Field definitions, export formats, and the group ↔ component structures the build will map against" }],
          gives: [{ label: "One source of truth", detail: "No double handling." }],
          assumptions: ["Each later build inherits the capability of this one — nothing is rebuilt"] },

        { id: "bulk-upload", kind: "trigger", actor: "human_client", cluster: "layer", deliverable: "main",
          label: "Bulk upload", stakeholder: ["Your team"], action: "A whole intake at once",
          description: "A whole intake goes up in one spreadsheet. A whole intake from one spreadsheet: add new students, new components, update assessment results — in one go, in minutes instead of days.",
          confidence: "committed",
          needs: [{ id: "sample-sheet", type: "file", required: false, prompt: "A sample of the spreadsheets you'd upload (results, enrolments, components)" }],
          gives: [{ label: "An intake processed in minutes", detail: "Instead of days." }],
          assumptions: ["Assumes uploads follow a consistent column structure"] },

        { id: "dashboard", kind: "artifact", actor: "system", cluster: "reporting", deliverable: "main",
          label: "Completion view", stakeholder: ["Your team", "Moodle"], action: "Every student at a glance",
          description: "Completion status for every student, at a glance. Completion status for every student in a component, at a glance — and scores by module per student, live from Moodle. Reports and certificates generated at a click.",
          confidence: "committed",
          needs: [],
          gives: [{ label: "Reports at a click", detail: "Not compiled by hand across two systems." }],
          assumptions: ["Assumes completion can be derived from data already in both systems"] },

        { id: "it-session", kind: "hitl", actor: "human_client", cluster: "reporting", deliverable: "main",
          label: "IT session", stakeholder: ["Your IT lead"], action: "Confirm the access list",
          description: "One session with your IT lead, before the build starts. A working session to confirm the complete list of access and information required before the build begins.",
          confidence: "scoped",
          needs: [
            { id: "it-lead", type: "contact", required: true, prompt: "Who is your IT lead for the access working session?" },
            { id: "poc", type: "contact", required: true, prompt: "A dedicated point of contact (POC) for template requests" },
          ],
          gives: [{ label: "A confirmed access list", detail: "" }],
          assumptions: ["Preliminary — the definitive access list is confirmed during the pre-work week"] },
      ],
      edges: [
        { from: "axcelerate", to: "middle-layer", kind: "data", volume: 2 },
        { from: "moodle", to: "middle-layer", kind: "data", volume: 2 },
        { from: "bulk-upload", to: "middle-layer", kind: "triggers" },
        { from: "middle-layer", to: "dashboard", kind: "data" },
        { from: "it-session", to: "middle-layer", kind: "depends" },
      ],
      scenarios: [],
    },
  },

  // AUTOMATION LAB — the consultancy engagement itself
  // =========================================================================
  {
    slug: "automation-lab",
    name: "Automation Lab — Workflow Intelligence & Automation",
    client_name: "Automation Lab",
    client_contact_name: null,
    pain_points: [
      "No clear view of how work actually moves through the team",
      "Bottlenecks are felt but not located",
      "No agreed order for which automations to build first",
    ],
    objectives: [
      "See how work actually happens and where it slows",
      "Prioritise automations by impact and effort",
      "Measure results at each step",
    ],
    graph: {
      preset: "program",
      headline: "Watch how work actually happens, map it, then automate it in the order that pays back fastest.",
      headline_metric: { unit: "stages", amount: 4, basis: "audit, mapping, roadmap, dashboards" },
      deliverables: [
        { id: "main", label: "The engagement", summary: "Four stages, each producing an artefact the next one builds on.", metric: null },
      ],
      nodes: [
        { id: "discovery", kind: "trigger", actor: "human_lexops", cluster: "stage-1", deliverable: "main",
          label: "Discovery", stakeholder: ["Your team", "LexOps"], action: "Workflows, pain, goals",
          description: "Understand your workflows, pain points and goals.",
          confidence: "committed",
          needs: [{ id: "goals", type: "longtext", required: true, prompt: "What does a good outcome from this engagement look like to you?" }],
          gives: [{ label: "A shared starting point", detail: "" }],
          assumptions: ["Assumes the people who own the workflows join the conversation"] },

        { id: "audit", kind: "step", actor: "human_lexops", cluster: "stage-1", deliverable: "main",
          label: "Workflow audit", stakeholder: ["LexOps"], action: "Watch the work happen",
          description: "We watch how the work actually happens. We watch how work actually happens, identify what's slow, and spot opportunities to automate.",
          confidence: "committed",
          needs: [{ id: "observation-access", type: "confirm", required: true, prompt: "Can we sit with the teams whose workflows we're auditing?", confirm_label: "Yes, that can be arranged" }],
          gives: [{ label: "Workflow documentation", detail: "A clear view of how work moves through your team." }],
          assumptions: ["Assumes teams are available to be observed during the audit"] },

        { id: "mapping", kind: "artifact", actor: "human_lexops", cluster: "stage-2", deliverable: "main",
          label: "Workflow maps", stakeholder: ["LexOps"], action: "Where the time goes",
          description: "Each workflow is broken into clear steps and drawn. We break down each workflow into clear steps, producing visual diagrams showing exactly how work moves and where the bottlenecks are.",
          confidence: "committed",
          needs: [{ id: "existing-docs", type: "file", required: false, prompt: "Any existing process documentation, however rough" }],
          gives: [{ label: "Visual flowcharts", detail: "Bottleneck analysis and complexity scoring showing where time is lost." }],
          assumptions: ["Assumes workflows are stable enough to map meaningfully"] },

        { id: "roadmap", kind: "gate", actor: "human_client", cluster: "stage-3", deliverable: "main",
          label: "Automation roadmap", stakeholder: ["Your team"], action: "What to build first",
          description: "We prioritise which automations to build first based on impact and effort. Start with quick wins, then tackle bigger opportunities.",
          confidence: "committed",
          needs: [{ id: "constraints", type: "longtext", required: false, prompt: "Any constraints we should design around — systems, budget, timing?" }],
          gives: [{ label: "A prioritised automation plan", detail: "Phased implementation with ROI estimates." }],
          assumptions: ["Assumes priorities can be agreed across the teams involved"] },

        { id: "dashboards", kind: "artifact", actor: "system", cluster: "stage-4", deliverable: "main",
          label: "Dashboards", stakeholder: ["Your systems"], action: "Time saved, errors down",
          description: "We set up monitoring to track performance. Dashboards show time saved, errors reduced and efficiency gains.",
          confidence: "committed",
          needs: [{ id: "systems-list", type: "longtext", required: true, prompt: "Which existing systems should the dashboards integrate with?" }],
          gives: [{ label: "Performance dashboards", detail: "Monitoring tools, integrated with your existing systems." }],
          assumptions: ["Assumes your existing systems can expose the metrics shown"] },
      ],
      edges: [
        { from: "discovery", to: "audit", kind: "triggers" },
        { from: "audit", to: "mapping", kind: "data" },
        { from: "mapping", to: "roadmap", kind: "depends" },
        { from: "roadmap", to: "dashboards", kind: "triggers" },
      ],
      scenarios: [],
    },
  },
];
