// Bulletproof CTA button. Uses a table with an HTML `bgcolor` attribute rather
// than a CSS-only <a> background, because dark-mode engines (Outlook especially)
// respect bgcolor but recolor CSS backgrounds — which was turning our orange red.
function ctaButton(href: string, label: string): string {
  return `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 16px 0;">
    <tr>
      <td align="center" bgcolor="#FF6B00" style="border-radius: 8px;">
        <a href="${href}" target="_blank" style="display: inline-block; padding: 13px 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff !important; text-decoration: none; border-radius: 8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

// Base email template wrapper
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>bruh.</title>
  <style>
    :root { color-scheme: dark; supported-color-schemes: dark; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e5e5e5;
      margin: 0;
      padding: 0;
      background-color: #0a0a0a;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: #171717;
      border: 1px solid #262626;
      border-radius: 12px;
      padding: 32px;
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
      margin-bottom: 24px;
      display: block;
    }
    .logo span {
      color: #FF6B00;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #a3a3a3;
    }
    .muted {
      color: #737373;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      color: #737373;
      font-size: 12px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #2a2a2a;
      margin: 24px 0;
    }
    .highlight {
      background: #212121;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    code {
      background: #212121;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      color: #e5e5e5;
    }
  </style>
</head>
<body bgcolor="#0a0a0a" style="background-color: #0a0a0a; margin: 0; padding: 0;">
  <div class="container">
    <div class="card" bgcolor="#171717" style="background-color: #171717;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://getbruh.app'}" class="logo" style="color: #ffffff;">
        bruh<span style="color: #FF6B00;">.</span>
      </a>
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} bruh. All rights reserved.</p>
      <p>You received this email because you have an account or were invited to bruh.</p>
    </div>
  </div>
</body>
</html>
`;
}

// Team invitation email
export function teamInviteEmail({
  teamName,
  inviterName,
  role,
  inviteLink,
}: {
  teamName: string;
  inviterName: string;
  role: string;
  inviteLink: string;
}): { subject: string; html: string } {
  return {
    subject: `You've been invited to join ${teamName} on bruh.`,
    html: baseTemplate(`
      <h1>Join ${teamName}</h1>
      <p>${inviterName} has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.</p>

      <div class="highlight">
        <p style="margin: 0;"><strong>What you'll be able to do:</strong></p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #a3a3a3;">
          ${role === 'admin' ? `
            <li>Manage team settings and members</li>
            <li>Create and manage projects</li>
            <li>Assign and complete tasks</li>
          ` : role === 'member' ? `
            <li>Create and manage projects</li>
            <li>Create and complete tasks</li>
            <li>Comment on tasks</li>
          ` : `
            <li>View team projects and tasks</li>
            <li>Comment on tasks</li>
          `}
        </ul>
      </div>

      ${ctaButton(inviteLink, "Accept Invitation")}

      <hr class="divider">

      <p class="muted">This invitation expires in 7 days. If you weren't expecting this email, you can safely ignore it.</p>
    `),
  };
}

// Welcome email
export function welcomeEmail({
  userName,
}: {
  userName?: string;
}): { subject: string; html: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getbruh.app';
  return {
    subject: `Welcome to bruh.!`,
    html: baseTemplate(`
      <h1>Welcome${userName ? `, ${userName}` : ''}! 🎉</h1>
      <p>Thanks for joining bruh. We're excited to help you get focused and accomplish more.</p>

      <div class="highlight">
        <p style="margin: 0 0 8px 0;"><strong>Here's what you can do:</strong></p>
        <ul style="margin: 0; padding-left: 20px; color: #a3a3a3;">
          <li>Create tasks and organize them in lists</li>
          <li>Use the Pomodoro timer to stay focused</li>
          <li>Track your habits and goals</li>
          <li>Collaborate with your team</li>
        </ul>
      </div>

      ${ctaButton(`${appUrl}/today`, "Get Started")}

      <hr class="divider">

      <p class="muted">Need help? Just reply to this email or visit our docs.</p>
    `),
  };
}

// Password reset email
export function passwordResetEmail({
  resetLink,
}: {
  resetLink: string;
}): { subject: string; html: string } {
  return {
    subject: `Reset your bruh. password`,
    html: baseTemplate(`
      <h1>Reset Your Password</h1>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>

      ${ctaButton(resetLink, "Reset Password")}

      <hr class="divider">

      <p class="muted">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="muted" style="word-break: break-all;">${resetLink}</p>
    `),
  };
}

// Task assigned email
export function taskAssignedEmail({
  taskTitle,
  projectName,
  assignerName,
  taskLink,
  dueDate,
}: {
  taskTitle: string;
  projectName: string;
  assignerName: string;
  taskLink: string;
  dueDate?: string;
}): { subject: string; html: string } {
  return {
    subject: `New task assigned: ${taskTitle}`,
    html: baseTemplate(`
      <h1>New Task Assigned</h1>
      <p>${assignerName} assigned you a task in <strong>${projectName}</strong>.</p>

      <div class="highlight">
        <p style="margin: 0; font-weight: 600; font-size: 16px;">${taskTitle}</p>
        ${dueDate ? `<p style="margin: 8px 0 0 0; color: #a3a3a3;">Due: ${dueDate}</p>` : ''}
      </div>

      ${ctaButton(taskLink, "View Task")}
    `),
  };
}

// Daily digest email
export function dailyDigestEmail({
  userName,
  todayTasks,
  overdueTasks,
  completedYesterday,
  dashboardLink,
}: {
  userName?: string;
  todayTasks: { title: string; time?: string }[];
  overdueTasks: { title: string; daysOverdue: number }[];
  completedYesterday: number;
  dashboardLink: string;
}): { subject: string; html: string } {
  const greeting = getTimeGreeting();

  return {
    subject: `${greeting}${userName ? `, ${userName}` : ''} - Your bruh. Daily Digest`,
    html: baseTemplate(`
      <h1>${greeting}${userName ? `, ${userName}` : ''}!</h1>
      <p>Here's what's on your plate today.</p>

      ${completedYesterday > 0 ? `
        <div class="highlight" style="background: #14261a; border: 1px solid #1f3a29;">
          <p style="margin: 0; color: #86efac;">🎉 You completed <strong style="color: #bbf7d0;">${completedYesterday} task${completedYesterday === 1 ? '' : 's'}</strong> yesterday!</p>
        </div>
      ` : ''}

      ${overdueTasks.length > 0 ? `
        <div class="highlight" style="background: #2a1815; border: 1px solid #4a2b22;">
          <p style="margin: 0 0 8px 0; color: #fca5a5;"><strong>⚠️ Overdue (${overdueTasks.length})</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #fca5a5;">
            ${overdueTasks.slice(0, 5).map(t => `<li>${t.title} (${t.daysOverdue}d)</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${todayTasks.length > 0 ? `
        <div class="highlight">
          <p style="margin: 0 0 8px 0;"><strong>📋 Today's Tasks (${todayTasks.length})</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #a3a3a3;">
            ${todayTasks.slice(0, 8).map(t => `<li>${t.title}${t.time ? ` at ${t.time}` : ''}</li>`).join('')}
            ${todayTasks.length > 8 ? `<li>...and ${todayTasks.length - 8} more</li>` : ''}
          </ul>
        </div>
      ` : `
        <div class="highlight">
          <p style="margin: 0; color: #86efac;">✅ No tasks scheduled for today!</p>
        </div>
      `}

      ${ctaButton(dashboardLink, "Open bruh.")}
    `),
  };
}

// Weekly summary email
export function weeklySummaryEmail({
  userName,
  tasksCompleted,
  focusMinutes,
  streakDays,
  topProject,
  dashboardLink,
}: {
  userName?: string;
  tasksCompleted: number;
  focusMinutes: number;
  streakDays: number;
  topProject?: string;
  dashboardLink: string;
}): { subject: string; html: string } {
  const focusHours = Math.round(focusMinutes / 60);

  return {
    subject: `Your Weekly bruh. Summary`,
    html: baseTemplate(`
      <h1>Your Week in Review</h1>
      <p>Here's how you did this week${userName ? `, ${userName}` : ''}.</p>

      <div style="display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0;">
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #FF6B00;">${tasksCompleted}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #a3a3a3;">Tasks Done</p>
        </div>
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10b981;">${focusHours}h</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #a3a3a3;">Focus Time</p>
        </div>
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #f59e0b;">${streakDays}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #a3a3a3;">Day Streak</p>
        </div>
      </div>

      ${topProject ? `
        <p>Your most active project: <strong>${topProject}</strong></p>
      ` : ''}

      ${ctaButton(dashboardLink, "View Full Stats")}

      <hr class="divider">

      <p class="muted">Keep up the momentum! 💪</p>
    `),
  };
}

// Payment failed / dunning reminder email.
// Used for both the initial failure notice (dayNumber 1) and the daily
// reminders that follow, up to the grace window. `payLink` is Stripe's hosted
// invoice URL so the customer can pay the exact failed invoice in one click.
export function paymentFailedEmail({
  payLink,
  daysLeft,
  isTeam,
}: {
  payLink: string;
  daysLeft: number;
  isTeam?: boolean;
}): { subject: string; html: string } {
  const what = isTeam ? "your team's bruh. subscription" : "your bruh. Pro subscription";
  const subject =
    daysLeft <= 1
      ? `Last chance: update your payment to keep bruh. Pro`
      : `Your bruh. payment didn't go through`;
  return {
    subject,
    html: baseTemplate(`
      <h1>We couldn't process your payment</h1>
      <p>The last payment for ${what} didn't go through. No stress, it happens. Update your card and you're back in business.</p>

      <div class="highlight" style="background: #2a1815; border: 1px solid #4a2b22;">
        <p style="margin: 0; color: #fca5a5;">
          You still have Pro access for <strong style="color: #fecaca;">${daysLeft} more day${daysLeft === 1 ? "" : "s"}</strong>.
          After that, your subscription will be canceled and you'll drop to the free plan.
        </p>
      </div>

      ${ctaButton(payLink, "Update payment &amp; keep Pro")}

      <hr class="divider">

      <p class="muted">If you already updated your card, you can ignore this. If the button doesn't work, paste this link into your browser:</p>
      <p class="muted" style="word-break: break-all;">${payLink}</p>
    `),
  };
}

// Subscription canceled after the grace window expired with no successful payment.
export function subscriptionCanceledEmail({
  payLink,
  isTeam,
}: {
  payLink: string;
  isTeam?: boolean;
}): { subject: string; html: string } {
  const what = isTeam ? "Your team's bruh. subscription" : "Your bruh. Pro subscription";
  return {
    subject: `Your bruh. Pro subscription was canceled`,
    html: baseTemplate(`
      <h1>Your subscription was canceled</h1>
      <p>${what} was canceled because we couldn't collect payment after several tries. Your account is still here, now on the free plan, with all your data intact.</p>

      <p>Want Pro back? Resubscribe anytime, it takes about 20 seconds.</p>

      ${ctaButton(payLink, "Resubscribe")}

      <hr class="divider">

      <p class="muted">No hard feelings. bruh.</p>
    `),
  };
}

// Admin email (sent from admin dashboard)
export function adminEmail({
  message,
}: {
  message: string;
}): string {
  return baseTemplate(`
    <div style="white-space: pre-wrap; line-height: 1.8;">
${message}
    </div>

    <hr class="divider">

    <p class="muted">This email was sent by a bruh. administrator.</p>
  `);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
