import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "LexOps <noreply@lex-ops.io>";
const REPLY_TO = "hello@teamsquared.io";
const PORTAL_URL = "https://client.lex-ops.io";

// ---------------------------------------------------------------------------
// Shared HTML helpers
// ---------------------------------------------------------------------------
const emailWrapper = (content: string) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0f1318;border-radius:10px;overflow:hidden">
  <div style="padding:28px 32px 20px;border-bottom:1px solid #1e2730;display:flex;align-items:center;gap:10px">
    <svg width="28" height="28" viewBox="0 0 32 32"><path d="M4 10 L4 28 L16 28 L16 24 L8 24 L8 10 Z" fill="#232A34"/><path d="M28 4 L16 4 L16 8 L24 8 L24 22 L28 22 Z" fill="#375971"/></svg>
    <span style="font-size:15px;font-weight:600;color:#ffffff">LexOps</span>
  </div>
  <div style="padding:32px">${content}</div>
  <div style="padding:16px 32px;background:#080c10;text-align:center">
    <p style="color:#3a4a58;font-size:12px;margin:0">LexOps · A Teams Squared Company · hello@teamsquared.io</p>
  </div>
</div>`;

const ctaButton = (text: string, url: string) =>
  `<a href="${url}" style="display:inline-block;background:#375971;color:#ffffff;padding:13px 28px;border-radius:7px;text-decoration:none;font-weight:600;font-size:15px;margin-top:24px">${text}</a>`;

const bodyText = (text: string) =>
  `<p style="color:#9DB5C9;font-size:15px;line-height:1.6;margin:0 0 8px">${text}</p>`;

const heading = (text: string) =>
  `<h2 style="color:#ffffff;font-size:22px;margin:0 0 16px;font-weight:600">${text}</h2>`;

async function send(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: FROM, replyTo: REPLY_TO, to, subject, html });
  } catch (err: any) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// CORE USER MANAGEMENT
// ---------------------------------------------------------------------------
export async function sendAdminInvite(email: string, fullName: string, inviteUrl: string) {
  await send(email, "You've been invited to manage LexOps", emailWrapper(
    heading("You're now an admin on LexOps") +
    bodyText(`Hi ${fullName}, you've been added as an administrator on the LexOps portal by the Teams Squared team. Click below to set up your account.`) +
    ctaButton("Set up your account →", inviteUrl)
  ));
}

export async function sendMemberInvite(email: string, fullName: string, inviteUrl: string) {
  await send(email, "You've been invited to join LexOps", emailWrapper(
    heading("Welcome to LexOps") +
    bodyText(`Hi ${fullName}, the Teams Squared team has added you to the LexOps portal as a team member. Click below to set up your account.`) +
    ctaButton("Set up your account →", inviteUrl)
  ));
}

export async function sendClientProjectInvite(email: string, fullName: string, projectName: string, inviteUrl: string) {
  await send(email, "You've been added to a project on LexOps", emailWrapper(
    heading(`You've been added to ${projectName}`) +
    bodyText(`Hi ${fullName}, you've been added to ${projectName} on the LexOps client portal. Click below to set up your account and access your project dashboard.`) +
    ctaButton("Access your portal →", inviteUrl)
  ));
}

export async function sendClientProposalInvite(email: string, fullName: string, projectName: string, inviteUrl: string) {
  await send(email, "Your LexOps portal is ready", emailWrapper(
    heading("Your portal is ready") +
    bodyText(`Hi ${fullName}, thank you for accepting your proposal. Your project dashboard for ${projectName} is set up and ready to go. Click below to create your password and get started.`) +
    ctaButton("Access your portal →", inviteUrl)
  ));
}

export async function sendPasswordReset(email: string, fullName: string, resetUrl: string) {
  await send(email, "Reset your LexOps password", emailWrapper(
    heading("Reset your password") +
    bodyText(`Hi ${fullName}, we received a request to reset your LexOps password. Click below to choose a new one. If you didn't request this, you can safely ignore this email.`) +
    ctaButton("Reset password →", resetUrl)
  ));
}

export async function sendPasswordChanged(email: string, fullName: string) {
  await send(email, "Your password has been updated", emailWrapper(
    heading("Password changed") +
    bodyText(`Hi ${fullName}, your LexOps password was successfully updated. If you didn't make this change, contact us immediately at hello@teamsquared.io.`)
  ));
}

// ---------------------------------------------------------------------------
// PROPOSAL FLOW
// ---------------------------------------------------------------------------
export async function sendProposalLink(email: string, clientName: string, projectName: string, proposalUrl: string) {
  await send(email, "Your proposal from LexOps is ready to review", emailWrapper(
    heading("Your proposal is ready") +
    bodyText(`Hi ${clientName}, your proposal for ${projectName} from LexOps is ready to review. Click below to view the full proposal and accept the terms to get started.`) +
    ctaButton("Review your proposal →", proposalUrl)
  ));
}

export async function sendProposalViewed(adminEmail: string, clientName: string, projectName: string) {
  await send(adminEmail, `Proposal viewed: ${projectName}`, emailWrapper(
    heading(`${clientName} has viewed their proposal`) +
    bodyText(`${clientName} has opened the proposal for ${projectName}. They haven't accepted yet — now is a good time for a follow-up if needed.`) +
    ctaButton("View in portal →", PORTAL_URL)
  ));
}

export async function sendProposalAccepted(adminEmail: string, clientName: string, projectName: string) {
  await send(adminEmail, `Proposal accepted — ${projectName}`, emailWrapper(
    heading("Proposal accepted") +
    bodyText(`${clientName} has accepted the proposal for ${projectName}. A project has been automatically created and they will receive an invite to set up their portal account.`) +
    ctaButton("View project →", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// DOCUMENT REQUESTS
// ---------------------------------------------------------------------------
export async function sendDocumentRequest(email: string, clientName: string, projectName: string, requestTitle: string, requestDescription: string) {
  const desc = requestDescription ? ` Details: ${requestDescription}` : "";
  await send(email, `Action required: document needed for ${projectName}`, emailWrapper(
    heading("A document has been requested") +
    bodyText(`Hi ${clientName}, your LexOps team needs a document from you for ${projectName}.`) +
    bodyText(`Request: ${requestTitle}.${desc}`) +
    bodyText("Please log in to your portal to upload it.") +
    ctaButton("Upload document →", PORTAL_URL)
  ));
}

export async function sendDocumentRequestReminder(email: string, clientName: string, projectName: string, requestTitle: string) {
  await send(email, `Reminder: document still needed for ${projectName}`, emailWrapper(
    heading("Just a reminder") +
    bodyText(`Hi ${clientName}, we're still waiting on a document from you for ${projectName}: ${requestTitle}. Please upload it at your earliest convenience so we can keep your project moving.`) +
    ctaButton("Upload now →", PORTAL_URL)
  ));
}

export async function sendDocumentUploaded(adminEmail: string, clientName: string, projectName: string, documentName: string) {
  await send(adminEmail, `Document uploaded: ${projectName}`, emailWrapper(
    heading(`${clientName} uploaded a document`) +
    bodyText(`${clientName} has uploaded ${documentName} for ${projectName}. Log in to the portal to review it.`) +
    ctaButton("View document →", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// PROJECT ACTIVITY
// ---------------------------------------------------------------------------
export async function sendPhaseComplete(email: string, clientName: string, projectName: string, phaseName: string, nextPhaseName: string | null) {
  const next = nextPhaseName ? `Next up: ${nextPhaseName}.` : "Your project is nearly complete.";
  await send(email, `Milestone reached: ${phaseName}`, emailWrapper(
    heading("A milestone has been reached") +
    bodyText(`Hi ${clientName}, great news — ${phaseName} has been completed on your ${projectName} project. ${next}`) +
    ctaButton("View your project →", PORTAL_URL)
  ));
}

export async function sendProjectComplete(email: string, clientName: string, projectName: string) {
  await send(email, `Your project is complete`, emailWrapper(
    heading(`${projectName} is complete`) +
    bodyText(`Hi ${clientName}, we're thrilled to let you know that ${projectName} has been completed. All deliverables have been handed over. Thank you for working with LexOps — we hope to work with you again soon.`) +
    ctaButton("View your project summary →", PORTAL_URL)
  ));
}

export async function sendTaskAssigned(email: string, clientName: string, projectName: string, taskTitle: string, taskDescription: string) {
  const desc = taskDescription ? ` ${taskDescription}` : "";
  await send(email, `Action needed on ${projectName}`, emailWrapper(
    heading("You have a new action item") +
    bodyText(`Hi ${clientName}, your LexOps team has assigned you an action item on ${projectName}: ${taskTitle}.${desc}`) +
    bodyText("Log in to your portal to complete it.") +
    ctaButton("View action item →", PORTAL_URL)
  ));
}

// ---------------------------------------------------------------------------
// BACKLOG (implemented, not wired to triggers yet)
// ---------------------------------------------------------------------------
export async function sendWeeklyUpdate(email: string, clientName: string, projectName: string, completedItems: string[], upcomingItems: string[], actionItems: string[]) {
  const pill = (text: string, color: string) =>
    `<span style="display:inline-block;background:${color}18;color:${color};border:1px solid ${color}30;border-radius:99px;padding:3px 12px;font-size:13px;font-weight:500;margin:3px 2px">${text}</span>`;

  let sections = "";
  if (completedItems.length) {
    sections += `<div style="margin-bottom:20px"><p style="color:#4ade80;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Completed</p>${completedItems.map(i => pill(i, "#4ade80")).join("")}</div>`;
  }
  if (upcomingItems.length) {
    sections += `<div style="margin-bottom:20px"><p style="color:#4a7fa5;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Upcoming</p>${upcomingItems.map(i => pill(i, "#4a7fa5")).join("")}</div>`;
  }
  if (actionItems.length) {
    sections += `<div style="margin-bottom:20px"><p style="color:#f59e0b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Actions Needed</p>${actionItems.map(i => pill(i, "#f59e0b")).join("")}</div>`;
  }

  await send(email, `Your weekly update: ${projectName}`, emailWrapper(
    heading(`This week on ${projectName}`) +
    bodyText(`Hi ${clientName}, here's your weekly project update.`) +
    sections +
    ctaButton("View your project →", PORTAL_URL)
  ));
}

export async function sendWelcomeEmail(email: string, clientName: string, projectName: string) {
  await send(email, "Welcome to your LexOps portal", emailWrapper(
    heading(`Welcome, ${clientName}`) +
    bodyText(`Your LexOps portal for ${projectName} is all set up. This is where you'll track progress, access documents, and stay up to date on everything we're doing for you.`) +
    ctaButton("Go to your portal →", PORTAL_URL)
  ));
}

export async function sendClientInactive(adminEmail: string, clientName: string, projectName: string, daysSinceLogin: number) {
  await send(adminEmail, `Client hasn't logged in: ${projectName}`, emailWrapper(
    heading(`${clientName} hasn't logged in recently`) +
    bodyText(`${clientName} hasn't logged in to their portal for ${daysSinceLogin} days on project ${projectName}. Consider reaching out to check in.`) +
    ctaButton("View project →", PORTAL_URL)
  ));
}

export async function sendProjectStalled(adminEmail: string, projectName: string, daysSinceUpdate: number) {
  await send(adminEmail, `Project update needed: ${projectName}`, emailWrapper(
    heading(`${projectName} needs an update`) +
    bodyText(`No updates have been logged on ${projectName} for ${daysSinceUpdate} days. Consider updating the project status to keep the client informed.`) +
    ctaButton("Update project →", PORTAL_URL)
  ));
}
