import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = "LexOps Portal <isuru@lex-ops.io>";
const REPLY_TO = "isuru@lex-ops.io";
const PORTAL_URL = "https://client.lex-ops.io";

// ---------------------------------------------------------------------------
// Shared HTML helpers — Light theme
// ---------------------------------------------------------------------------
const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <tr><td style="padding:24px 32px;background:#f8f9fa;border-bottom:1px solid #e9ecef">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:10px">
        <svg width="24" height="24" viewBox="0 0 32 32"><path d="M4 10 L4 28 L16 28 L16 24 L8 24 L8 10 Z" fill="#232A34"/><path d="M28 4 L16 4 L16 8 L24 8 L24 22 L28 22 Z" fill="#232A34"/></svg>
      </td>
      <td><span style="font-size:16px;font-weight:600;color:#1a2235;letter-spacing:-0.01em">LexOps</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px 32px">${content}</td></tr>
  <tr><td style="padding:20px 32px;background:#f8f9fa;border-top:1px solid #e9ecef;text-align:center">
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5">LexOps &middot; A Teams Squared Company<br>hello@teamsquared.io</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

const ctaButton = (text: string, url: string) =>
  `<table cellpadding="0" cellspacing="0" style="margin-top:28px"><tr><td style="background:#375971;border-radius:8px;padding:13px 28px"><a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">${text}</a></td></tr></table>`;

const bodyText = (text: string) =>
  `<p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 10px">${text}</p>`;

const heading = (text: string) =>
  `<h2 style="color:#1a2235;font-size:20px;margin:0 0 18px;font-weight:600">${text}</h2>`;

const subText = (text: string) =>
  `<p style="color:#6b7280;font-size:13px;line-height:1.6;margin:8px 0 0">${text}</p>`;

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — skipping "${subject}" to ${to}`);
    return;
  }
  try {
    await resend.emails.send({ from: FROM, replyTo: REPLY_TO, to, subject, html });
  } catch (err: any) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message);
  }
}

function firstName(fullName: string): string {
  return (fullName || "there").split(/\s+/)[0];
}

// ---------------------------------------------------------------------------
// a. Admin Invite
// ---------------------------------------------------------------------------
export async function sendAdminInvite(email: string, fullName: string, inviteUrl: string) {
  const name = firstName(fullName);
  await send(email, "You've been invited to LexOps", emailWrapper(
    heading("Welcome to the team") +
    bodyText(`Hi ${name}, you've been added as an administrator on LexOps. Set up your account to start managing projects and clients.`) +
    ctaButton("Set up your account", inviteUrl)
  ));
}

// ---------------------------------------------------------------------------
// b. Member Invite
// ---------------------------------------------------------------------------
export async function sendMemberInvite(email: string, fullName: string, inviteUrl: string) {
  const name = firstName(fullName);
  await send(email, "You've been invited to LexOps", emailWrapper(
    heading("Welcome to LexOps") +
    bodyText(`Hi ${name}, the team has added you to the LexOps portal. Set up your account to get started.`) +
    ctaButton("Set up your account", inviteUrl)
  ));
}

// ---------------------------------------------------------------------------
// c. Client Project Invite
// ---------------------------------------------------------------------------
export async function sendClientProjectInvite(email: string, fullName: string, projectName: string, inviteUrl: string) {
  const name = firstName(fullName);
  await send(email, `You've been added to ${projectName}`, emailWrapper(
    heading(`You're set up on ${projectName}`) +
    bodyText(`Hi ${name}, your project dashboard is ready. Set up your account to track progress, view documents, and stay in the loop.`) +
    ctaButton("Access your portal", inviteUrl)
  ));
}

// ---------------------------------------------------------------------------
// d. Client Proposal Invite (after accepting proposal)
// ---------------------------------------------------------------------------
export async function sendClientProposalInvite(email: string, fullName: string, projectName: string, inviteUrl: string) {
  const name = firstName(fullName);
  await send(email, "Your project portal is ready", emailWrapper(
    heading("Your portal is ready") +
    bodyText(`Hi ${name}, thanks for accepting the proposal for ${projectName}. Your dashboard is set up — create your password to get started.`) +
    ctaButton("Create your account", inviteUrl)
  ));
}

// ---------------------------------------------------------------------------
// e. Password Reset
// ---------------------------------------------------------------------------
export async function sendPasswordReset(email: string, fullName: string, resetUrl: string) {
  const name = firstName(fullName);
  await send(email, "Reset your password", emailWrapper(
    heading("Reset your password") +
    bodyText(`Hi ${name}, we received a request to reset your LexOps password. Click below to choose a new one.`) +
    subText("If you didn't request this, you can safely ignore this email.") +
    ctaButton("Reset password", resetUrl)
  ));
}

// ---------------------------------------------------------------------------
// f. Password Changed
// ---------------------------------------------------------------------------
export async function sendPasswordChanged(email: string, fullName: string) {
  const name = firstName(fullName);
  await send(email, "Your password has been updated", emailWrapper(
    heading("Password updated") +
    bodyText(`Hi ${name}, your LexOps password was successfully changed.`) +
    subText("If you didn't make this change, contact us immediately at hello@teamsquared.io.")
  ));
}

// ---------------------------------------------------------------------------
// g. Proposal Link (send proposal to client for review)
// ---------------------------------------------------------------------------
export async function sendProposalLink(email: string, clientName: string, projectName: string, proposalUrl: string) {
  const name = firstName(clientName);
  await send(email, `Your proposal for ${projectName}`, emailWrapper(
    heading("Your proposal is ready") +
    bodyText(`Hi ${name}, your proposal for ${projectName} is ready to review. Take a look and accept the terms when you're ready to get started.`) +
    ctaButton("Review proposal", proposalUrl)
  ));
}

// ---------------------------------------------------------------------------
// h. Proposal Viewed (admin notification)
// ---------------------------------------------------------------------------
export async function sendProposalViewed(adminEmail: string, clientName: string, projectName: string) {
  await send(adminEmail, `Proposal viewed: ${clientName}`, emailWrapper(
    heading("Proposal viewed") +
    bodyText(`${clientName} has opened the proposal for ${projectName}. They haven't accepted yet — consider following up.`) +
    ctaButton("View in portal", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// i. Proposal Accepted (admin notification)
// ---------------------------------------------------------------------------
export async function sendProposalAccepted(adminEmail: string, clientName: string, projectName: string) {
  await send(adminEmail, `Proposal accepted: ${clientName}`, emailWrapper(
    heading("Proposal accepted") +
    bodyText(`${clientName} has accepted the proposal for ${projectName}. Their project and portal account have been created automatically.`) +
    ctaButton("View project", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// j. Document Request (to client)
// ---------------------------------------------------------------------------
export async function sendDocumentRequest(email: string, clientName: string, projectName: string, requestTitle: string, requestDescription: string) {
  const name = firstName(clientName);
  const desc = requestDescription ? `<br><span style="color:#6b7280;font-size:14px">${requestDescription}</span>` : "";
  await send(email, `Document needed: ${requestTitle}`, emailWrapper(
    heading("We need a document from you") +
    bodyText(`Hi ${name}, your team needs <strong>${requestTitle}</strong> for ${projectName}.${desc}`) +
    bodyText("Upload it through your portal and we'll take it from there.") +
    ctaButton("Upload document", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// k. Document Request Reminder
// ---------------------------------------------------------------------------
export async function sendDocumentRequestReminder(email: string, clientName: string, projectName: string, requestTitle: string) {
  const name = firstName(clientName);
  await send(email, `Reminder: ${requestTitle} still needed`, emailWrapper(
    heading("Friendly reminder") +
    bodyText(`Hi ${name}, we're still waiting on <strong>${requestTitle}</strong> for ${projectName}. Uploading it will help us keep things moving.`) +
    ctaButton("Upload now", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// l. Document Uploaded (admin notification)
// ---------------------------------------------------------------------------
export async function sendDocumentUploaded(adminEmail: string, clientName: string, projectName: string, documentName: string) {
  await send(adminEmail, `Document uploaded: ${documentName}`, emailWrapper(
    heading("New document uploaded") +
    bodyText(`${clientName} uploaded <strong>${documentName}</strong> for ${projectName}.`) +
    ctaButton("Review document", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// m. Phase Complete (to client)
// ---------------------------------------------------------------------------
export async function sendPhaseComplete(email: string, clientName: string, projectName: string, phaseName: string, nextPhaseName: string | null) {
  const name = firstName(clientName);
  const next = nextPhaseName ? ` Next up: <strong>${nextPhaseName}</strong>.` : " Your project is nearly complete.";
  await send(email, `Milestone complete: ${phaseName}`, emailWrapper(
    heading("Milestone reached") +
    bodyText(`Hi ${name}, <strong>${phaseName}</strong> on ${projectName} is complete.${next}`) +
    ctaButton("View progress", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// n. Project Complete (to client)
// ---------------------------------------------------------------------------
export async function sendProjectComplete(email: string, clientName: string, projectName: string) {
  const name = firstName(clientName);
  await send(email, `${projectName} is complete`, emailWrapper(
    heading("Your project is complete") +
    bodyText(`Hi ${name}, ${projectName} has been completed and all deliverables have been handed over. Thank you for working with us.`) +
    ctaButton("View summary", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// o. Task Assigned (to client)
// ---------------------------------------------------------------------------
export async function sendTaskAssigned(email: string, clientName: string, projectName: string, taskTitle: string, taskDescription: string) {
  const name = firstName(clientName);
  const desc = taskDescription ? `<br><span style="color:#6b7280;font-size:14px">${taskDescription}</span>` : "";
  await send(email, `Action needed: ${taskTitle}`, emailWrapper(
    heading("You have an action item") +
    bodyText(`Hi ${name}, your team has added an item for you on ${projectName}: <strong>${taskTitle}</strong>.${desc}`) +
    ctaButton("View action item", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// p. Weekly Update (to client)
// ---------------------------------------------------------------------------
export async function sendWeeklyUpdate(email: string, clientName: string, projectName: string, completedItems: string[], upcomingItems: string[], actionItems: string[]) {
  const name = firstName(clientName);

  const pill = (text: string, color: string) =>
    `<span style="display:inline-block;background:${color}12;color:${color};border:1px solid ${color}30;border-radius:99px;padding:4px 14px;font-size:13px;font-weight:500;margin:3px 2px">${text}</span>`;

  let sections = "";
  if (completedItems.length) {
    sections += `<div style="margin:20px 0 0"><p style="color:#16a34a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Completed</p>${completedItems.map(i => pill(i, "#16a34a")).join("")}</div>`;
  }
  if (upcomingItems.length) {
    sections += `<div style="margin:20px 0 0"><p style="color:#375971;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Upcoming</p>${upcomingItems.map(i => pill(i, "#375971")).join("")}</div>`;
  }
  if (actionItems.length) {
    sections += `<div style="margin:20px 0 0"><p style="color:#d97706;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Needs Your Attention</p>${actionItems.map(i => pill(i, "#d97706")).join("")}</div>`;
  }

  await send(email, `Weekly update: ${projectName}`, emailWrapper(
    heading(`This week on ${projectName}`) +
    bodyText(`Hi ${name}, here's what happened this week.`) +
    sections +
    ctaButton("View your project", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// q. Welcome Email
// ---------------------------------------------------------------------------
export async function sendWelcomeEmail(email: string, clientName: string, projectName: string) {
  const name = firstName(clientName);
  await send(email, "Welcome to your LexOps portal", emailWrapper(
    heading(`Welcome, ${name}`) +
    bodyText(`Your portal for ${projectName} is ready. This is where you'll track progress, access documents, and stay in the loop on everything we're doing for you.`) +
    ctaButton("Go to your portal", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// r-2. v2 Proposal Invite (client invite with login credentials)
// ---------------------------------------------------------------------------
export async function sendV2ProposalInvite(
  email: string,
  proposalName: string,
  portalUrl: string,
  loginEmail: string,
  tempPassword: string | null
) {
  const credBlock = tempPassword
    ? `<div style="margin:20px 0;background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:16px 20px">
        <p style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px">Your login details</p>
        <p style="color:#374151;font-size:14px;margin:0 0 6px"><strong>Email:</strong> ${loginEmail}</p>
        <p style="color:#374151;font-size:14px;margin:0"><strong>Temporary password:</strong> ${tempPassword}</p>
       </div>`
    : "";
  await send(email, `Lex Ops has sent you a proposal for ${proposalName}`, emailWrapper(
    heading(`Your proposal is ready`) +
    bodyText(`Lex Ops has sent you a proposal for <strong>${proposalName}</strong>. Log in to review the proposal, try the workflow demos, and share your feedback.`) +
    credBlock +
    ctaButton("Review your proposal", portalUrl) +
    subText("You can log in at any time using the credentials above or by clicking the button.")
  ));
}

// ---------------------------------------------------------------------------
// r. Client Inactive (admin notification)
// ---------------------------------------------------------------------------
export async function sendClientInactive(adminEmail: string, clientName: string, projectName: string, daysSinceLogin: number) {
  await send(adminEmail, `Inactive client: ${clientName}`, emailWrapper(
    heading("Client hasn't logged in") +
    bodyText(`${clientName} hasn't visited their portal for ${daysSinceLogin} days on ${projectName}. It might be worth checking in.`) +
    ctaButton("View project", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// s. Project Stalled (admin notification)
// ---------------------------------------------------------------------------
export async function sendProjectStalled(adminEmail: string, projectName: string, daysSinceUpdate: number) {
  await send(adminEmail, `No updates: ${projectName}`, emailWrapper(
    heading("Project needs an update") +
    bodyText(`${projectName} hasn't had an update in ${daysSinceUpdate} days. Updating the status will keep the client informed.`) +
    ctaButton("Update project", PORTAL_URL)
  ));
}
