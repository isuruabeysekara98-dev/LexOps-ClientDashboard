// ---------------------------------------------------------------------------
// Mission Control — the capture set, expressed in the proposalCanvas schema.
// ---------------------------------------------------------------------------
// Source: the 19–25 Aug 2026 screen-capture stitch (315 rows across four
// non-concurrent clips — Piyara 08-19, Himaya 08-20, Jerome 08-20, Zolara
// 08-25). Threads were reconstructed from *content* signals — shared artifact
// names, shared client names, explicit person-to-person handoffs, and a message
// sent by one person later seen landing on another's screen — never from time
// proximity alone.
//
// WHY THIS FILE EXISTS SEPARATELY FROM THE COMPONENT
// The page renders `nodes`/`edges` through the existing <ProposalCanvas>. That
// component knows nothing about capture clips, and must not — so every mapping
// decision from "what the footage showed" to "what the canvas draws" is made
// here, once, and is reviewable without reading any rendering code.
//
// THE EVIDENCE TIER IS `confidence`. This is the load-bearing mapping in the
// file. proposalCanvas already fades a node by confidence (alphaFor: committed
// 1.0, scoped 0.78, exploratory 0.55), which is exactly the semantics evidence
// strength needs — a weakly-evidenced touchpoint should look less certain, not
// less important. So:
//     committed   = Explicit  — a named handoff, or a quoted message seen on
//                               the other person's own screen
//     scoped      = Strong    — a shared artifact or client name links two
//                               touchpoints, with no quote proving the handoff
//     exploratory = Weak      — keyword similarity only; not a confirmed link
// A faded bubble means weaker evidence, NOT lesser work. The key says so too.
//
// ACTORS ARE HONEST, AND THAT IS WHY THE MAP IS MOSTLY AMBER.
// Every touchpoint in this dataset was performed by a person, so `actor` is
// `human_lexops` almost everywhere, and language.js paints that amber. The
// first instinct is to fight it — recolour ordinary steps blue so the decisions
// stand out. That would be a lie about the thing the PRD is actually asking
// (§5: "where the process automation opportunity lies"): an amber-dominant map
// is the finding. None of this work is automated. The single blue-with-a-gold-
// core bubble in thread 02 is the only AI-assisted step in six hours of
// footage. Decisions stay legible because `kind` carries them as SHAPE — a
// faceted gate, an amber-corona checkpoint — not as hue.
//
// Nothing here is authored for effect: counts, handoffs and human checkpoints
// are all derived from these rows by the page, never typed in alongside them.
// ---------------------------------------------------------------------------

/** Channels the work lived in. Rendered as `system` anchors under the channel lens. */
export const CHANNELS = {
  hrgang: { id: "hrgang", label: "HR gang" },
  dm: { id: "dm", label: "1:1 threads" },
  offb: { id: "offb", label: "Offboarding" },
  email: { id: "email", label: "Email" },
  props: { id: "props", label: "Proposals & Profiles" },
  proc: { id: "proc", label: "Procurement" },
};

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------
// `tier` and `reportsTo` are INFERRED from observed sign-off direction — who
// authorises whose sends, whose ruling ends a thread. This is not an HR chart
// and must not be read as one, which is why every person carries a `basis`
// string stating the evidence for their placement. Two of the three decision
// makers have no footage of their own.
export const PEOPLE = {
  samindi: {
    id: "samindi", name: "Samindi De Silva", short: "Samindi",
    role: "HR & Compliance Principal", loc: "Colombo", clip: null,
    tier: 1, fn: "People & Compliance", decision: true, reportsTo: null,
    basis: "No one in the capture set overrules her; two threads terminate at her ruling.",
  },
  jude: {
    id: "jude", name: "Jude Pottier", short: "Jude",
    role: "Client Delivery Principal", loc: "Colombo", clip: null,
    tier: 1, fn: "Delivery & Clients", decision: true, reportsTo: null,
    basis: "Makes the client-facing roll-off call unilaterally; no approval step precedes it on camera.",
  },
  himaya: {
    id: "himaya", name: "Himaya Gunawardena", short: "Himaya",
    role: "People Ops Lead", loc: "Colombo", clip: "Aug 20, 03:48–05:48 UTC",
    tier: 2, fn: "People & Compliance", decision: true, reportsTo: "samindi",
    basis: "Samindi gates her output in both cross-person threads — she asks Samindi for a ruling on the care package, and hands the ISO document to her for re-work.",
  },
  akil: {
    id: "akil", name: "Akil Fernando", short: "Akil",
    role: "IT Security / ISO Reviewer", loc: "Colombo", clip: null,
    tier: 2, fn: "Security & IT", decision: false, reportsTo: "samindi",
    basis: "Reviews Samindi's ISO rewrite, but is assigned device tasks by Himaya. The direction of report is genuinely ambiguous in this data — the weakest placement on the map.",
  },
  piyara: {
    id: "piyara", name: "Piyara Wijekoon", short: "Piyara",
    role: "People Ops Executive", loc: "Colombo", clip: "Aug 19, 04:25–06:38 UTC",
    tier: 3, fn: "People & Compliance", decision: false, reportsTo: "himaya",
    basis: "Himaya authorises her sends: “shall we offboard her?” → “Yes, you can send the exit email.”",
  },
  jerome: {
    id: "jerome", name: "Jerome Verallo", short: "Jerome",
    role: "Operations", loc: "Philippines", clip: "Aug 20, 04:18–06:05 UTC",
    tier: 3, fn: "Proposals & Ops", decision: false, reportsTo: "himaya",
    basis: "Himaya tasks him directly in a 1:1 (“can we please get something for both aaron and beverly”) and he reports back to her.",
  },
  zolara: {
    id: "zolara", name: "Zolara Peiris", short: "Zolara",
    role: "Proposals & Profiles", loc: "Colombo", clip: "Aug 25, 08:06–08:42 UTC",
    tier: 3, fn: "Proposals & Ops", decision: false, reportsTo: "jude",
    basis: "Builds candidate decks for the client deals Jude runs. Inferred from channel role, not from an observed instruction.",
  },
  dhawalani: {
    id: "dhawalani", name: "Dhawalani Sumanarathne", short: "Dhawalani",
    role: "Proposals", loc: "Colombo", clip: null,
    tier: 3, fn: "Proposals & Ops", decision: false, reportsTo: "jude",
    basis: "Appears only in the Proposals and Profiles channel alongside Zolara and Jude. Weak evidence.",
  },
  nadun: {
    id: "nadun", name: "Nadun Fonseka", short: "Nadun",
    role: "Finance & Admin", loc: "Colombo", clip: null,
    tier: 4, fn: "Proposals & Ops", decision: false, reportsTo: "samindi",
    basis: "Appears once, cc'd on an exit email. Placement is a guess, not a finding.",
  },
  lei: {
    id: "lei", name: "Lei Panganiban", short: "Lei",
    role: "Contractor — offboarded", loc: "Philippines", clip: null,
    tier: 5, fn: "Delivery & Clients", decision: false, reportsTo: "jude",
    external: true,
    basis: "Rolled off a client engagement by Jude's decision on 19 Aug. The subject of a workflow, not an actor in one.",
  },
};

export const TIER_LABEL = {
  1: "Principals — nobody overrules them on camera",
  2: "Leads — they authorise and gate other people's work",
  3: "Executors — they produce the work product",
  4: "Support — notified, not deciding",
  5: "External — the subject of a workflow, not an actor",
};

export const FUNCTIONS = [
  "People & Compliance",
  "Security & IT",
  "Delivery & Clients",
  "Proposals & Ops",
];

// ---------------------------------------------------------------------------
// Threads
// ---------------------------------------------------------------------------
// `stop: true` marks where a thread's last visible state is. `status` says what
// that state *means*, which is a different fact from "the last bubble drawn".
export const THREADS = [
  {
    id: "t1", n: "01", name: "Beverly & Aaron care package",
    status: "stalled", statusLabel: "Stalled", evidence: "Explicit",
    span: "19 Aug 05:29 → 20 Aug 05:12 UTC",
    summary:
      "Sourcing a gift or care package for two staff after flood and dengue hardship. Bounced between three people and never closed.",
    shape:
      "Bounced — the decision reverses once (hamper → cash → neither) and ends owned by someone with no footage.",
    caveat:
      "The 23h 05m gap between the first two touchpoints crosses entirely off-camera time. Only a 1–2 hr slice of each day was captured.",
    steps: [
      { id: "t1a", who: "piyara", ch: "hrgang", kind: "step", confidence: "scoped", size: "small",
        at: "19 Aug 05:29", label: "Identifies Beverly", action: "Names the client",
        quote: "who is this? / this is Beverly — RMK lawyers is the client",
        description: "Clarifies Beverly's identity to the group. No gift discussion yet.",
        state: "Identity established" },
      { id: "t1b", who: "jerome", ch: "dm", kind: "trigger", confidence: "committed", size: "medium",
        at: "20 Aug 04:34", label: "Picks up the ask", action: "Work enters here",
        quote: "can we please get something for both aaron and beverly",
        description: "His screen shows the 1:1 with Himaya, including his own prior replies — “ill look into this”, “yes, i just got John's reply late last night”.",
        state: "In progress" },
      { id: "t1c", who: "jerome", ch: "dm", kind: "step", confidence: "committed", size: "medium",
        at: "20 Aug 04:35", label: "Sources a hamper", action: "Sends the option",
        quote: "GBPH Mixed Groceries 02 — giftbasket.ph, ~57 AUD",
        description: "Posts the link to Himaya and waits for a reaction.",
        state: "Sent" },
      { id: "t1d", who: "himaya", ch: "dm", kind: "step", confidence: "committed", size: "medium",
        at: "20 Aug 04:36", label: "Link lands", action: "Caught from both ends", verified: true,
        description: "The same message appears in her own capture 68 seconds after Jerome sent it — two machines, two countries, one conversation recorded independently. The only timestamp-verified cross-person link in the dataset.",
        state: "Received" },
      { id: "t1e", who: "jerome", ch: "dm", kind: "gate", confidence: "committed", size: "medium",
        at: "20 Aug 04:39", label: "Cash, or a hamper?", action: "The path splits",
        quote: "so they can use it to maybe buy something useful or help their families",
        description: "Himaya asks whether a hamper would work; Jerome pushes back and argues for cash.",
        state: "Position stated" },
      { id: "t1f", who: "himaya", ch: "hrgang", kind: "step", confidence: "committed", size: "medium",
        at: "20 Aug 04:45", label: "Escalates it", action: "Into HR gang",
        quote: "This is what Jerome suggested… this wont work anyways, 50 aud is not enough",
        description: "Forwards the suggestion into the group and asks Samindi for input.",
        state: "Escalated, no decision" },
      { id: "t1g", who: "samindi", ch: "hrgang", kind: "gate", confidence: "committed", size: "large",
        at: "20 Aug 04:49", label: "Rules cash out", action: "On policy grounds",
        quote: "we still don't have a doc controlling staff welfare",
        description: "Blocks cash for Philippines-based staff. There is no staff-welfare policy to point at — the missing document is what causes the rework.",
        state: "Blocked on policy" },
      { id: "t1h", who: "himaya", ch: "hrgang", kind: "step", confidence: "committed", size: "small",
        at: "20 Aug 04:51", label: "Pivots to dry rations", action: "Reframes the search",
        description: "Reframes the search and notes Jerome already sourced a hamper.",
        state: "Reframed, still open" },
      { id: "t1i", who: "samindi", ch: "hrgang", kind: "hitl", confidence: "committed", size: "large",
        pain: true, stop: true,
        at: "20 Aug 05:12", label: "Parked indefinitely", action: "No owner, no date",
        quote: "let me know… when I take a break from the laptop screen I will search",
        description: "The last visible state in either clip.",
        state: "Stalled" },
    ],
    links: [
      { from: "t1a", to: "t1b", tier: "strong", note: "Same client-name detail across a 23h cross-clip gap" },
      { from: "t1b", to: "t1c", tier: "explicit" },
      { from: "t1c", to: "t1d", tier: "explicit", note: "Timestamp-verified from both ends, 68 seconds apart" },
      { from: "t1d", to: "t1e", tier: "explicit" },
      { from: "t1e", to: "t1f", tier: "explicit" },
      { from: "t1f", to: "t1g", tier: "explicit" },
      { from: "t1g", to: "t1h", tier: "explicit" },
      { from: "t1h", to: "t1i", tier: "explicit", stalled: true },
    ],
  },
  {
    id: "t2", n: "02", name: "ISO 27001 offboarding document",
    status: "pending", statusLabel: "Awaiting review", evidence: "Explicit / Strong",
    span: "19 Aug 05:52 → 20 Aug 05:41 UTC",
    summary:
      "Building the Offboarding Asset Declaration & Return Form as ISO 27001 audit evidence. A clean chain of ownership that stops at a reviewer with no footage.",
    shape:
      "Clean handoff — author → formatter → standards editor → reviewer. Nothing bounces backward.",
    caveat:
      "The 22h 19m gap crosses off-camera time. Himaya's own “9:42 PM prior day” note is direct evidence that real work happened in a window neither clip recorded.",
    steps: [
      { id: "t2a", who: "piyara", ch: "hrgang", kind: "ai", actor: "ai", confidence: "committed", size: "large",
        at: "19 Aug 05:52–06:14", label: "Drafts the form", action: "Word + a model, side by side",
        quote: "Teams Squared — Offboarding Asset Declaration & Return Form (ISO 27001 Compliance)",
        description: "Written in Word alongside a ChatGPT “ISO Policy project” thread generating the same text: contractor fields, asset table, access checklist, confidentiality and payment declarations. The only AI-assisted step in the whole capture set.",
        state: "In progress" },
      { id: "t2b", who: "piyara", ch: "hrgang", kind: "step", confidence: "committed", size: "small",
        at: "19 Aug 06:21", label: "Shares for review", action: "Link into HR gang",
        description: "Drops the link into the group and asks whether branding can be added once it is done.",
        state: "Sent for review" },
      { id: "t2c", who: "samindi", ch: "hrgang", kind: "gate", confidence: "committed", size: "medium",
        at: "19 Aug ~06:25", label: "Approves, one comment", action: "Formatting only",
        quote: "This is fine Piyara. Please check on the formatting and alignment. I only had one comment.",
        description: "The approval pre-dates the screenshot; the exact send time was never captured.",
        state: "Approved" },
      { id: "t2d", who: "himaya", ch: "hrgang", kind: "step", confidence: "committed", size: "medium",
        offcamera: true,
        at: "19 Aug 21:42", label: "Formatting pass", action: "Off camera, overnight",
        quote: "I downloaded the doc and added the formatting Piyara",
        description: "Her own note, timestamped the prior evening. A named handoff — the strongest link in this thread, and direct proof that work happened outside the capture window.",
        state: "Formatted" },
      { id: "t2e", who: "samindi", ch: "hrgang", kind: "gate", confidence: "committed", size: "medium",
        at: "20 Aug 04:43", label: "Re-opens it", action: "Asks for a second check",
        quote: "this is okay? let me know so we can attach it moving forward… alignment and formatting chuti adjustments needed.",
        description: "Reopens the formatting question rather than accepting the pass.",
        state: "Re-opened" },
      { id: "t2f", who: "samindi", ch: "hrgang", kind: "step", confidence: "committed", size: "medium",
        at: "20 Aug 05:27", label: "Takes the edit herself", action: "Ownership moves",
        quote: "Hima, allow me 5–10 mins to give you the edited Offboarding checklist.",
        description: "Ownership of the document moves fully to Samindi.",
        state: "In progress with Samindi" },
      { id: "t2g", who: "samindi", ch: "hrgang", kind: "artifact", confidence: "committed", size: "large",
        at: "20 Aug 05:39", label: "ISO-standard version", action: "Produced",
        quote: "Guys I changed the offboarding format to fit the ISO standards. I am waiting for Akil to check and comment.",
        description: "A terminology question resolves in passing — “are we allowed to use the term employee?” answered “We can take that off, not a prob.”",
        state: "Produced" },
      { id: "t2h", who: "akil", ch: "hrgang", kind: "hitl", confidence: "scoped", size: "large",
        stop: true,
        at: "20 Aug 05:41", label: "Awaiting Akil's review", action: "Still sitting here",
        description: "No clip shows the review happening. This is the last known state of the document.",
        state: "Unresolved" },
    ],
    links: [
      { from: "t2a", to: "t2b", tier: "explicit" },
      { from: "t2b", to: "t2c", tier: "explicit" },
      { from: "t2c", to: "t2d", tier: "explicit", note: "Himaya names Piyara directly" },
      { from: "t2d", to: "t2e", tier: "explicit" },
      { from: "t2e", to: "t2f", tier: "explicit" },
      { from: "t2f", to: "t2g", tier: "strong", note: "No shared file name or link connects the two versions" },
      { from: "t2g", to: "t2h", tier: "strong", stalled: true },
    ],
  },
  {
    id: "t3", n: "03", name: "Lei Panganiban offboarding",
    status: "closed", statusLabel: "Closed", evidence: "Explicit",
    span: "19 Aug 04:29 → 06:36 UTC",
    summary:
      "A departing contractor rolled off a client engagement and formally exited — remote wipe, laptop collection, exit email. The one thread that runs from open decision to confirmed completion on camera.",
    shape:
      "Single-owner execution with explicit group sign-off at every decision point.",
    caveat:
      "None needed. This thread starts, is decided and closes inside one continuous 68-minute capture window.",
    steps: [
      { id: "t3a", who: "jude", ch: "offb", kind: "gate", confidence: "committed", size: "medium",
        offcamera: true,
        at: "19 Aug 04:29", label: "Decides to roll Lei off", action: "Per a client response",
        description: "Tail end of a thread in the Offboarding channel. Jude calls it immediately. The decision itself was made off camera.",
        state: "Decision made" },
      { id: "t3b", who: "piyara", ch: "hrgang", kind: "step", confidence: "committed", size: "small",
        at: "19 Aug 06:12", label: "Asks for the go-ahead", action: "Raises it in HR gang",
        quote: "and guys Himaya what are we doing with lei? shall we offboard her?",
        description: "Raises it in the group rather than acting on Jude's call alone.",
        state: "Awaiting sign-off" },
      { id: "t3c", who: "himaya", ch: "hrgang", kind: "gate", confidence: "committed", size: "medium",
        at: "19 Aug 06:12", label: "Gives the go-ahead", action: "Same minute",
        quote: "Yes, you can send the exit email.",
        description: "Explicit authorisation, in the same minute it was asked for.",
        state: "Approved" },
      { id: "t3d", who: "himaya", ch: "hrgang", kind: "step", confidence: "committed", size: "small",
        at: "19 Aug 06:22", label: "Confirms logistics", action: "No handovers due",
        quote: "she has no handovers to be done too",
        description: "Last date was yesterday; proposes Akil do a remote wipe and collect the laptop.",
        state: "Logistics agreed" },
      { id: "t3e", who: "akil", ch: "offb", kind: "hitl", confidence: "committed", size: "medium",
        offcamera: true,
        at: "19 Aug 06:22", label: "Assigned wipe & collection", action: "Never confirmed",
        description: "Named owner for the device steps. No footage confirms he completed them — the one open edge in an otherwise closed thread.",
        state: "Assigned" },
      { id: "t3f", who: "piyara", ch: "offb", kind: "step", confidence: "committed", size: "small",
        at: "19 Aug 06:28", label: "Calls Lei", action: "Contact made",
        quote: "Lei's call is done",
        description: "Himaya shares the number; Piyara makes the call.",
        state: "Contact made" },
      { id: "t3g", who: "piyara", ch: "email", kind: "step", confidence: "committed", size: "medium",
        at: "19 Aug 06:33", label: "Drafts the exit email", action: "End of Engagement",
        quote: "End of Engagement — Lei Panganiban",
        description: "Attaches the Exit Interview Form and corrects the last-working-day date. Cc HR and Nadun Fonseka.",
        state: "Drafted" },
      { id: "t3h", who: "nadun", ch: "email", kind: "step", confidence: "committed", size: "small",
        at: "19 Aug 06:35", label: "Nadun cc'd", action: "Finance notified",
        description: "His sole appearance in the capture set.",
        state: "Notified" },
      { id: "t3i", who: "piyara", ch: "hrgang", kind: "artifact", confidence: "committed", size: "large",
        stop: true, closed: true,
        at: "19 Aug 06:36", label: "Exit email sent", action: "Loop closed",
        quote: "exit email sent… that's done… i informed lei that you will get in touch for the exit interview",
        description: "Closed in the group with an explicit confirmation. The only thread in the set that ends this way.",
        state: "Completed" },
    ],
    links: [
      { from: "t3a", to: "t3b", tier: "explicit" },
      { from: "t3b", to: "t3c", tier: "explicit" },
      { from: "t3c", to: "t3d", tier: "explicit" },
      { from: "t3d", to: "t3e", tier: "explicit" },
      { from: "t3d", to: "t3f", tier: "explicit" },
      { from: "t3f", to: "t3g", tier: "explicit" },
      { from: "t3g", to: "t3h", tier: "explicit" },
      { from: "t3g", to: "t3i", tier: "explicit" },
    ],
  },
  {
    id: "uA", n: "A", name: "Candidate deck (“dock”) pattern", unconfirmed: true,
    status: "weak", statusLabel: "Pattern, not a thread", evidence: "Weak",
    span: "19 Aug → 25 Aug",
    summary:
      "Three separate candidate profile decks built for three different client deals. A recurring process pattern — the only thing linking the instances is the channel and the word “dock”.",
    shape: "A recurring shape across three distinct deals. Not one task continued.",
    caveat:
      "No specific artifact or named handoff ties any two instances together. Do not treat this as a single workflow.",
    steps: [
      { id: "uAa", who: "zolara", ch: "props", kind: "step", confidence: "exploratory", size: "small",
        at: "19 Aug", label: "Dock for Lex Altico", action: "Posted",
        description: "Posted by Zolara in Proposals and Profiles; seen in Piyara's clip.",
        state: "Posted" },
      { id: "uAb", who: "jude", ch: "props", kind: "step", confidence: "exploratory", size: "small",
        at: "20 Aug", label: "Dock for Etherial Holdings", action: "A photo exchange",
        description: "A Jude and Zolara exchange about a candidate photo, seen in Himaya's clip. Different deal, different candidate.",
        state: "In review" },
      { id: "uAc", who: "dhawalani", ch: "props", kind: "step", confidence: "exploratory", size: "small",
        at: "20–25 Aug", label: "Same channel, same shape", action: "Parallel work",
        description: "Dhawalani builds and shares dock links alongside the other two. No shared artifact with either instance.",
        state: "Parallel" },
      { id: "uAd", who: "zolara", ch: "props", kind: "artifact", confidence: "exploratory", size: "medium",
        stop: true,
        at: "25 Aug", label: "Dock for Evolve500", action: "Built end to end",
        description: "Built start to finish inside Zolara's own clip — the only instance visible in full.",
        state: "Built" },
    ],
    links: [
      { from: "uAa", to: "uAb", tier: "weak", note: "Channel name and the word “dock” only" },
      { from: "uAb", to: "uAc", tier: "weak" },
      { from: "uAc", to: "uAd", tier: "weak" },
    ],
  },
  {
    id: "uB", n: "B", name: "ISO audit prep chatter", unconfirmed: true,
    status: "weak", statusLabel: "Background context", evidence: "Weak",
    span: "19–20 Aug",
    summary:
      "Generic ISO-audit activity across both days. Beyond the offboarding document this shares only the keyword “ISO” — better described as context several threads sit inside.",
    shape: "Ambient, not sequential.",
    caveat: "Merging these on the keyword alone would create a workflow that does not exist.",
    steps: [
      { id: "uBa", who: "piyara", ch: "hrgang", kind: "step", confidence: "exploratory", size: "small",
        at: "19 Aug", label: "Chases LMS completions", action: "Audit prep",
        quote: "since we are doing the ISO audit",
        description: "Follows up on outstanding course completions.",
        state: "Chasing" },
      { id: "uBb", who: "himaya", ch: "hrgang", kind: "step", confidence: "exploratory", size: "small",
        stop: true,
        at: "20 Aug", label: "Generic “ISO work” to-dos", action: "Ambient",
        description: "Personal to-do items; a team outing is rescheduled twice “due to our ISO audit”.",
        state: "Ongoing" },
    ],
    links: [{ from: "uBa", to: "uBb", tier: "weak", note: "Keyword only — no common artifact" }],
  },
  {
    id: "uC", n: "C", name: "Procurement archiving — false merge", unconfirmed: true,
    status: "weak", statusLabel: "Ruled out", evidence: "Weak — rejected",
    span: "19–20 Aug",
    summary:
      "Two account-archiving discussions in the same channel with the same ISO justification, but about two different people. Kept visible because it is an easy false merge to make.",
    shape: "Two unrelated instances that look like one thread from keywords alone.",
    caveat:
      "Only checking the named individuals — Ely versus Tanzil Remu — ruled out the merge. Worth a manual pass on any other same-channel, same-justification pair.",
    steps: [
      { id: "uCa", who: "akil", ch: "proc", kind: "step", confidence: "exploratory", size: "small",
        at: "19 Aug", label: "Delete Ely's account", action: "Departed staffer",
        description: "Akil and Himaya discuss removing a departed staffer's Procurement account.",
        state: "Discussed" },
      { id: "uCb", who: "himaya", ch: "proc", kind: "step", confidence: "exploratory", size: "small",
        pain: true, stop: true,
        at: "20 Aug", label: "Un-archive Tanzil Remu", action: "A different person",
        quote: "to attach the evidence for the iso",
        description: "A separate debate about a different offboarded profile. Same channel, same justification, different person.",
        state: "Debated" },
    ],
    links: [{ from: "uCa", to: "uCb", tier: "weak", note: "REJECTED — different named individuals" }],
  },
];

// ---------------------------------------------------------------------------
// Observed relationships between people
// ---------------------------------------------------------------------------
// `w` counts touchpoints observed between the pair inside the captured windows.
// It is a floor, not a total: two people who worked together entirely off
// camera score zero here, which is the single biggest caveat on this view.
export const TIES = [
  { a: "himaya", b: "samindi", w: 8, wf: ["t1", "t2"], conf: true,
    note: "Every escalation Himaya makes lands on Samindi, and both times it stops there." },
  { a: "himaya", b: "piyara", w: 6, wf: ["t1", "t2", "t3"], conf: true,
    note: "The busiest confirmed pair — authorisation flows down, work product flows back up." },
  { a: "himaya", b: "jerome", w: 4, wf: ["t1"], conf: true,
    note: "The only pair whose exchange is independently timestamp-verified from both machines." },
  { a: "piyara", b: "samindi", w: 2, wf: ["t2"], conf: true, note: "Document approval, one round." },
  { a: "samindi", b: "akil", w: 1, wf: ["t2"], conf: true, note: "The ISO review handoff that never closes." },
  { a: "himaya", b: "akil", w: 1, wf: ["t3"], conf: true, note: "Device wipe and laptop collection, assigned." },
  { a: "jude", b: "piyara", w: 1, wf: ["t3"], conf: true, note: "Client roll-off decision reaching the executor." },
  { a: "piyara", b: "lei", w: 3, wf: ["t3"], conf: true, note: "Call, exit email, exit-interview handover." },
  { a: "piyara", b: "nadun", w: 1, wf: ["t3"], conf: true, note: "Single cc on the exit email." },
  { a: "zolara", b: "jude", w: 2, wf: ["uA"], conf: false, note: "Candidate photo exchange. Weak evidence." },
  { a: "zolara", b: "dhawalani", w: 1, wf: ["uA"], conf: false, note: "Same channel, no shared artifact." },
];

/** The four capture windows, in true UTC. Two of them overlap; the rest stand alone. */
export const CAPTURE = {
  hours: 6.6,
  personDays: 4,
  pct: 7,
  clips: [
    { who: "piyara", label: "Piyara — 19 Aug, 04:25–06:38 UTC", mins: 133 },
    { who: "himaya", label: "Himaya — 20 Aug, 03:48–05:48 UTC", mins: 120 },
    { who: "jerome", label: "Jerome — 20 Aug, 04:18–06:05 UTC", mins: 107 },
    { who: "zolara", label: "Zolara — 25 Aug, 08:06–08:42 UTC", mins: 36 },
  ],
};

// ---------------------------------------------------------------------------
// Schema mapping
// ---------------------------------------------------------------------------

/** Evidence tier → the `confidence` value proposalCanvas fades on. */
const TIER_TO_CONFIDENCE = { explicit: "committed", strong: "scoped", weak: "exploratory" };

/**
 * Evidence tier → edge kind.
 *
 * draw.js offers two edge treatments (`depends` dashes, everything else solid),
 * and we have three tiers. Solid is reserved for Explicit — a link you could
 * point at a quote for — and both softer tiers dash. The tier is not lost:
 * every node already carries it as opacity, and the panel names it in words.
 */
const TIER_TO_EDGE = { explicit: "triggers", strong: "depends", weak: "depends" };

export function threadById(id) {
  return THREADS.find((t) => t.id === id) || null;
}
export function stepById(id) {
  for (const t of THREADS) {
    const s = t.steps.find((x) => x.id === id);
    if (s) return { step: s, thread: t };
  }
  return null;
}

/**
 * The workflow map, as proposalCanvas nodes and edges.
 *
 * `cluster` is the thread, so the program preset lanes by workflow. `scenarios`
 * is also the thread, which is what drives the vertical axis under the pipeline
 * preset — one thread per band, so a handoff that leaves a thread is visible as
 * a line crossing between bands rather than as another node in a queue.
 */
export function buildWorkflowGraph({ withChannels = false } = {}) {
  const nodes = [];
  const edges = [];

  for (const th of THREADS) {
    for (const s of th.steps) {
      const person = PEOPLE[s.who];
      nodes.push({
        id: s.id,
        kind: s.kind,
        // Honest: a person did this. See the header note on why the map is amber.
        actor: s.actor || (person.external ? "human_client" : "human_lexops"),
        confidence: s.confidence,
        size: s.size,
        label: s.label,
        action: s.action,
        stakeholder: [person.short, CHANNELS[s.ch].label],
        cluster: th.name,
        scenarios: [th.id],
        description: s.description,
        pain: !!s.pain,
        // Capture-specific payload the panel reads. Ignored by readNode, which
        // keeps the whole node on `raw` — so nothing here can break the canvas.
        mc: {
          threadId: th.id, who: s.who, channel: s.ch, at: s.at, state: s.state,
          quote: s.quote || null, verified: !!s.verified, offcamera: !!s.offcamera,
          stop: !!s.stop, closed: !!s.closed,
        },
      });
    }

    for (const l of th.links) {
      edges.push({
        from: l.from, to: l.to,
        kind: TIER_TO_EDGE[l.tier],
        volume: l.tier === "explicit" ? 2 : 1,
        mc: { threadId: th.id, tier: l.tier, note: l.note || null, stalled: !!l.stalled },
      });
    }

    if (withChannels) {
      const seen = new Set(th.steps.map((s) => s.ch));
      for (const ch of seen) {
        const id = `${th.id}-ch-${ch}`;
        nodes.push({
          id,
          kind: "system", actor: "system", confidence: "committed", size: "medium",
          label: CHANNELS[ch].label, action: "Channel",
          cluster: th.name, scenarios: [th.id],
          description: "A channel the work lived in. Touchpoints orbit it.",
          mc: { threadId: th.id, isChannel: true, channel: ch },
        });
        for (const s of th.steps) {
          if (s.ch === ch) edges.push({ from: id, to: s.id, kind: "depends", volume: 1, mc: { channel: true } });
        }
      }
    }
  }
  return { nodes, edges };
}

/** How many workflows a person is observed across — drives bubble size. */
export function workflowsFor(personId, includeWeak = true) {
  const set = new Set();
  for (const t of TIES) {
    if (!includeWeak && !t.conf) continue;
    if (t.a === personId || t.b === personId) t.wf.forEach((w) => set.add(w));
  }
  return Math.max(1, set.size);
}

/** Everyone this person is observed interacting with, and how often. */
export function neighboursOf(personId, includeWeak = true) {
  const out = {};
  for (const t of TIES) {
    if (!includeWeak && !t.conf) continue;
    if (t.a === personId) out[t.b] = t;
    if (t.b === personId) out[t.a] = t;
  }
  return out;
}

/** Total observed touchpoints for a person. */
export function touchpointsFor(personId, includeWeak = true) {
  return TIES.reduce((n, t) => {
    if (!includeWeak && !t.conf) return n;
    return t.a === personId || t.b === personId ? n + t.w : n;
  }, 0);
}

/**
 * The role and reporting map.
 *
 * Seniority is the vertical axis, so `deliverable` is the tier and the program
 * preset lanes on it. Bubble size is workflows carried — the one number on this
 * view a reader can check against the other map by counting.
 *
 * Decision makers are `gate`: faceted, and amber for the same reason they are
 * amber on the workflow map. A person with no capture of their own reads as
 * `scoped`, which fades them — an honest signal that everything shown about
 * them was seen from somebody else's screen.
 */
export function buildPeopleGraph({ includeWeak = true } = {}) {
  const ids = Object.keys(PEOPLE).filter((id) => (includeWeak ? true : id !== "dhawalani"));

  const nodes = ids.map((id) => {
    const p = PEOPLE[id];
    const n = workflowsFor(id, includeWeak);
    return {
      id,
      kind: p.decision ? "gate" : "step",
      actor: p.external ? "human_client" : "human_lexops",
      confidence: p.clip ? "committed" : "scoped",
      // size is authored emphasis in language.js; workflows carried is the
      // claim this view is making, so it maps straight onto it.
      size: n >= 3 ? "large" : n === 2 ? "medium" : "small",
      label: p.short,
      action: p.role,
      stakeholder: [p.loc, p.clip ? "has clip" : "no clip"],
      cluster: p.fn,
      deliverable: `Tier ${p.tier}`,
      scenarios: [`tier${p.tier}`],
      description: p.basis,
      mc: { isPerson: true, personId: id, tier: p.tier, workflows: n },
    };
  });

  const edges = [];
  for (const t of TIES) {
    if (!includeWeak && !t.conf) continue;
    if (!ids.includes(t.a) || !ids.includes(t.b)) continue;
    edges.push({
      from: t.a, to: t.b,
      kind: t.conf ? "data" : "depends",
      // draw.js caps line width at 1 + min(3, volume - 1), so raw weights of
      // 1..8 would flatten to the cap. Rescaled onto 1..4 the ordering survives
      // inside the cap — the thickest line is still the busiest pair.
      volume: 1 + ((t.w - 1) * 3) / 7,
      mc: { tie: true, weight: t.w, note: t.note, conf: t.conf },
    });
  }
  for (const id of ids) {
    const to = PEOPLE[id].reportsTo;
    if (to && ids.includes(to)) {
      edges.push({ from: id, to, kind: "depends", volume: 1, mc: { reports: true } });
    }
  }
  return { nodes, edges };
}
