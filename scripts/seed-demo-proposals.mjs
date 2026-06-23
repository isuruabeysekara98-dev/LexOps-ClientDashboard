import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CREATED_BY = null; // seeded proposals — no owner required

const proposals = [
  {
    name: "Employment Tribunal Defence — Harrison & Co.",
    client_name: "Harrison & Co. Manufacturing",
    client_contact_name: "James Harrison",
    client_email: "james.harrison@harrisonmfg.co.uk",
    status: "sent",
    pain_points: [
      "Unexpected unfair-dismissal claim filed with no prior warning",
      "Limited HR documentation and inconsistent disciplinary records",
      "Tight response deadline with senior management unavailable",
    ],
    objectives: [
      "Successfully defend the tribunal claim and protect company reputation",
      "Minimise operational disruption during proceedings",
      "Establish robust HR processes to prevent future claims",
    ],
    workflow: {
      name: "Employment Tribunal Defence",
      emoji: "⚖️",
      show_try_matter: true,
      stages: [
        {
          order_index: 0,
          title: "Initial Claim Assessment",
          emoji: "📋",
          description: "Review the claim details, assess its merits, and identify the key legal issues and risks.",
          stats: [{ label: "Typical turnaround", value: "2–3 days" }, { label: "Documents reviewed", value: "5–12" }],
          inputs: [
            { emoji: "📄", label: "ET1 Claim Form", detail: "The claimant's formal tribunal claim submitted to ACAS" },
            { emoji: "📁", label: "Employment Contract", detail: "Signed contract and any subsequent amendments" },
            { emoji: "📝", label: "Disciplinary Records", detail: "All warnings, meetings, and correspondence" },
          ],
          outputs: [
            { label: "Merits Assessment Report", detail: "Prospects of success and recommended strategy" },
            { label: "Risk Register", detail: "Key risks, costs exposure, and settlement considerations" },
          ],
        },
        {
          order_index: 1,
          title: "Evidence Gathering",
          emoji: "📁",
          description: "Systematically collect and organise all relevant employment records, correspondence, and witness accounts.",
          stats: [{ label: "Avg documents", value: "20–80" }, { label: "Timeline", value: "1 week" }],
          inputs: [
            { emoji: "📧", label: "Internal Emails", detail: "All communications relevant to the dismissal period" },
            { emoji: "👥", label: "Manager Statements", detail: "First-hand accounts from decision-makers" },
            { emoji: "📊", label: "Performance Records", detail: "Appraisals, KPIs, and attendance logs" },
          ],
          outputs: [
            { label: "Evidence Bundle Index", detail: "Chronological index of all documents" },
            { label: "Disclosure List", detail: "Documents to be disclosed to claimant" },
          ],
        },
        {
          order_index: 2,
          title: "ET3 Response Drafting",
          emoji: "✏️",
          description: "Draft the employer's formal response (ET3), setting out the defence to each allegation.",
          stats: [{ label: "Deadline", value: "28 days from ET1" }, { label: "Pages", value: "4–10" }],
          inputs: [
            { emoji: "📋", label: "Assessed Claim Details", detail: "Output from initial assessment stage" },
            { emoji: "📁", label: "Evidence Bundle", detail: "Documents gathered in prior stage" },
          ],
          outputs: [
            { label: "Drafted ET3", detail: "Complete employer response ready for review and filing" },
            { label: "Case Summary", detail: "Plain-English summary of the defence position" },
          ],
        },
        {
          order_index: 3,
          title: "Witness Preparation",
          emoji: "👥",
          description: "Prepare company witnesses with statement drafting, mock questioning, and hearing guidance.",
          stats: [{ label: "Sessions", value: "2–3 per witness" }, { label: "Notice", value: "2 weeks ahead" }],
          inputs: [
            { emoji: "📝", label: "Witness List", detail: "Identified employees to give evidence" },
            { emoji: "📁", label: "Relevant Documents", detail: "Documents the witness will be examined on" },
          ],
          outputs: [
            { label: "Witness Statements", detail: "Signed statements for each company witness" },
            { label: "Preparation Notes", detail: "Guidance on what to expect at the hearing" },
          ],
        },
        {
          order_index: 4,
          title: "Tribunal Hearing",
          emoji: "🏛️",
          description: "Full legal representation at the Employment Tribunal hearing, including opening, cross-examination, and submissions.",
          stats: [{ label: "Duration", value: "1–3 days" }, { label: "Venue", value: "Employment Tribunal" }],
          inputs: [
            { emoji: "📦", label: "Hearing Bundle", detail: "Agreed bundle of documents for the Tribunal" },
            { emoji: "📜", label: "Skeleton Argument", detail: "Legal submissions filed in advance of hearing" },
          ],
          outputs: [
            { label: "Judgment", detail: "Written decision from the Employment Tribunal" },
            { label: "Post-Hearing Advice", detail: "Recommendations on appeal or compliance if needed" },
          ],
        },
      ],
    },
  },

  {
    name: "Commercial Lease Negotiation — Blackwell Retail Group",
    client_name: "Blackwell Retail Group",
    client_contact_name: "Sophie Blackwell",
    client_email: "sophie@blackwellretail.com",
    status: "sent",
    pain_points: [
      "Landlord insisting on tenant-unfriendly break clause conditions",
      "Open-ended rent review mechanism creating long-term financial uncertainty",
      "Service charge cap absent — exposing group to unbudgeted costs",
    ],
    objectives: [
      "Negotiate clean, unconditional break rights at agreed intervals",
      "Secure RPI-capped rent reviews with a collar and cap",
      "Cap and audit service charge liability across all sites",
    ],
    workflow: {
      name: "Commercial Lease Negotiation",
      emoji: "🏢",
      show_try_matter: true,
      stages: [
        {
          order_index: 0,
          title: "Heads of Terms Review",
          emoji: "📄",
          description: "Analyse the heads of terms and draft lease to identify all problematic clauses and commercial risks.",
          stats: [{ label: "Turnaround", value: "3–5 days" }, { label: "Clause types", value: "30–60 reviewed" }],
          inputs: [
            { emoji: "📜", label: "Heads of Terms", detail: "Agreed commercial terms between landlord and tenant" },
            { emoji: "📋", label: "Draft Lease", detail: "Landlord's solicitor's first draft" },
            { emoji: "🏢", label: "Site Details", detail: "Property particulars, floor plans, and permitted use" },
          ],
          outputs: [
            { label: "Review Report", detail: "Clause-by-clause commentary with risk ratings" },
            { label: "Priority Issues List", detail: "Red-line must-haves vs. negotiable points" },
          ],
        },
        {
          order_index: 1,
          title: "Negotiation Strategy",
          emoji: "🎯",
          description: "Build a structured negotiation position with fallback positions for each key commercial point.",
          stats: [{ label: "Issues mapped", value: "10–20" }, { label: "Timeline", value: "2–3 days" }],
          inputs: [
            { emoji: "📊", label: "Review Report", detail: "Output from heads of terms review" },
            { emoji: "💼", label: "Client Instructions", detail: "Business priorities and financial limits" },
          ],
          outputs: [
            { label: "Negotiation Plan", detail: "Opening positions, walk-aways, and concessions" },
            { label: "Redline Draft", detail: "Annotated lease with proposed amendments" },
          ],
        },
        {
          order_index: 2,
          title: "Landlord Negotiation",
          emoji: "🤝",
          description: "Direct negotiation with the landlord's solicitors to agree key terms, with regular client updates.",
          stats: [{ label: "Rounds", value: "2–5 typical" }, { label: "Duration", value: "2–6 weeks" }],
          inputs: [
            { emoji: "✏️", label: "Redline Draft", detail: "Our proposed lease amendments" },
            { emoji: "📧", label: "Correspondence", detail: "Ongoing exchange with landlord's solicitors" },
          ],
          outputs: [
            { label: "Agreed Amendments Schedule", detail: "All negotiated changes documented" },
            { label: "Engrossment Lease", detail: "Final clean lease incorporating agreed terms" },
          ],
        },
        {
          order_index: 3,
          title: "Pre-Completion Due Diligence",
          emoji: "🔍",
          description: "Property searches, title investigation, and landlord covenant checks before committing to completion.",
          stats: [{ label: "Searches", value: "4–8 standard" }, { label: "Turnaround", value: "1–2 weeks" }],
          inputs: [
            { emoji: "🗺️", label: "Title Register", detail: "Official copies from Land Registry" },
            { emoji: "📋", label: "Engrossment Lease", detail: "Final agreed lease form" },
          ],
          outputs: [
            { label: "Search Results Report", detail: "Summary of all search results and any issues" },
            { label: "Certificate of Title", detail: "Formal sign-off ready for completion" },
          ],
        },
        {
          order_index: 4,
          title: "Completion & Registration",
          emoji: "✅",
          description: "Execute the lease, pay any premium or deposit, and register the lease at Land Registry.",
          stats: [{ label: "SDLT deadline", value: "14 days post-completion" }, { label: "LR registration", value: "Required if >7yrs" }],
          inputs: [
            { emoji: "📜", label: "Signed Lease", detail: "Executed by all parties" },
            { emoji: "💰", label: "Completion Monies", detail: "Rent deposit, premium, and SDLT if applicable" },
          ],
          outputs: [
            { label: "Completed Lease", detail: "Dated, executed lease forming the tenancy" },
            { label: "Title Documents", detail: "Updated Land Registry title confirming registration" },
          ],
        },
      ],
    },
  },

  {
    name: "Data Breach Response — Meridian Health Tech",
    client_name: "Meridian Health Tech Ltd",
    client_contact_name: "Dr. Priya Nair",
    client_email: "priya.nair@meridianhealth.tech",
    status: "sent",
    pain_points: [
      "Patient health records potentially exposed in a third-party supplier breach",
      "ICO 72-hour notification window is closing — decision urgently needed",
      "Board and clinical leadership have conflicting views on public disclosure",
    ],
    objectives: [
      "Achieve ICO compliance and avoid regulatory enforcement action",
      "Contain the breach and prevent further unauthorised access",
      "Manage reputational risk with a clear, coordinated public response",
    ],
    workflow: {
      name: "Data Breach Response & Compliance",
      emoji: "🔒",
      show_try_matter: true,
      stages: [
        {
          order_index: 0,
          title: "Breach Scoping & Triage",
          emoji: "🚨",
          description: "Rapidly assess the nature, scope, and severity of the breach to determine notification obligations and immediate containment steps.",
          stats: [{ label: "Response window", value: "72 hours" }, { label: "Priority", value: "Critical" }],
          inputs: [
            { emoji: "📧", label: "Incident Report", detail: "Initial notification from supplier or internal IT" },
            { emoji: "🗄️", label: "Data Maps", detail: "Records of processing activities (ROPA) for affected systems" },
            { emoji: "📋", label: "Supplier Contracts", detail: "DPA and SLAs with the breached third party" },
          ],
          outputs: [
            { label: "Triage Assessment", detail: "Risk classification (low / moderate / high / severe)" },
            { label: "Containment Action Plan", detail: "Immediate steps to limit further data loss" },
          ],
        },
        {
          order_index: 1,
          title: "ICO Notification",
          emoji: "📢",
          description: "Prepare and submit the mandatory ICO notification within the 72-hour window under Article 33 UK GDPR.",
          stats: [{ label: "Legal deadline", value: "72 hrs from awareness" }, { label: "Threshold", value: "Risk to individuals" }],
          inputs: [
            { emoji: "📊", label: "Triage Assessment", detail: "Severity and scope established in prior stage" },
            { emoji: "📝", label: "Technical Details", detail: "Nature of breach, systems affected, data categories" },
          ],
          outputs: [
            { label: "ICO Notification Form", detail: "Completed Article 33 notification submitted online" },
            { label: "Notification Reference", detail: "ICO case reference for ongoing correspondence" },
          ],
        },
        {
          order_index: 2,
          title: "Data Subject Notification",
          emoji: "📧",
          description: "Identify affected individuals and draft compliant, plain-English notification letters under Article 34 UK GDPR.",
          stats: [{ label: "Threshold", value: "High risk to individuals" }, { label: "Tone", value: "Clear & non-alarming" }],
          inputs: [
            { emoji: "🗂️", label: "Affected Individuals List", detail: "Names and contact details of those whose data was exposed" },
            { emoji: "📋", label: "Breach Summary", detail: "Plain-language description of what happened and what was taken" },
          ],
          outputs: [
            { label: "Notification Letters", detail: "Personalised letters to each affected data subject" },
            { label: "FAQ Document", detail: "Q&A for individuals with advice on protecting themselves" },
          ],
        },
        {
          order_index: 3,
          title: "Technical Remediation",
          emoji: "🔧",
          description: "Work with your IT and security teams to close the breach vector, patch vulnerabilities, and restore secure operations.",
          stats: [{ label: "Priority", value: "Parallel to notification" }, { label: "Evidence", value: "Required for ICO" }],
          inputs: [
            { emoji: "🖥️", label: "Penetration Test Results", detail: "Forensic analysis of the breach entry point" },
            { emoji: "📋", label: "Containment Action Plan", detail: "Steps identified in triage stage" },
          ],
          outputs: [
            { label: "Remediation Report", detail: "Documented fixes and security improvements implemented" },
            { label: "Updated Security Controls", detail: "Revised policies, access controls, and monitoring" },
          ],
        },
        {
          order_index: 4,
          title: "Post-Incident Review & DPA Update",
          emoji: "📊",
          description: "Conduct a structured lessons-learned review and update your Data Protection Addenda, ROPA, and supplier contracts to prevent recurrence.",
          stats: [{ label: "Timeline", value: "Within 30 days" }, { label: "Output shared with", value: "ICO if requested" }],
          inputs: [
            { emoji: "📁", label: "Full Incident File", detail: "All documentation from stages 1–4" },
            { emoji: "📝", label: "Stakeholder Feedback", detail: "Input from IT, legal, clinical, and comms teams" },
          ],
          outputs: [
            { label: "Post-Incident Report", detail: "Root cause analysis and recommendations" },
            { label: "Updated ROPA & DPAs", detail: "Revised records of processing and supplier agreements" },
          ],
        },
      ],
    },
  },
];

async function seed() {
  console.log("🌱 Seeding demo proposals...\n");

  for (const p of proposals) {
    const token = randomUUID();

    // 1. Insert proposal
    const { data: proposal, error: pErr } = await sb
      .from("proposals")
      .insert({
        name: p.name,
        client_name: p.client_name,
        client_contact_name: p.client_contact_name,
        client_email: p.client_email,
        status: p.status,
        pain_points: p.pain_points,
        objectives: p.objectives,
        token,
        persona: {},
        stages: [],
      })
      .select()
      .single();

    if (pErr) { console.error("❌ Proposal insert failed:", pErr.message); continue; }
    console.log(`✅ Proposal: ${proposal.name} (${proposal.id})`);

    // 2. Insert workflow
    const { data: wf, error: wErr } = await sb
      .from("workflows")
      .insert({
        proposal_id: proposal.id,
        name: p.workflow.name,
        emoji: p.workflow.emoji,
        order_index: 0,
        show_try_matter: p.workflow.show_try_matter,
      })
      .select()
      .single();

    if (wErr) { console.error("❌ Workflow insert failed:", wErr.message); continue; }
    console.log(`   ↳ Workflow: ${wf.name} (show_try_matter: ${wf.show_try_matter})`);

    // 3. Insert stages
    for (const stage of p.workflow.stages) {
      const { error: sErr } = await sb
        .from("workflow_stages")
        .insert({
          workflow_id: wf.id,
          order_index: stage.order_index,
          title: stage.title,
          emoji: stage.emoji,
          description: stage.description,
          stats: stage.stats,
          inputs: stage.inputs,
          outputs: stage.outputs,
        });

      if (sErr) { console.error(`   ❌ Stage "${stage.title}" failed:`, sErr.message); }
      else console.log(`   ↳ Stage [${stage.order_index + 1}]: ${stage.emoji} ${stage.title}`);
    }

    console.log(`   🔗 Client link: /proposal/${token}\n`);
  }

  console.log("✅ Seeding complete.");
}

seed().catch(console.error);
