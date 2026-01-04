// Base email template wrapper
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bruh</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #000;
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
      margin: 0 0 16px 0;
    }
    p {
      margin: 0 0 16px 0;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background: #FF6B00;
      color: white !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background: #E55F00;
    }
    .secondary-button {
      background: #f3f4f6;
      color: #1f2937 !important;
    }
    .muted {
      color: #9ca3af;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      padding-top: 24px;
      color: #9ca3af;
      font-size: 12px;
    }
    .divider {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 24px 0;
    }
    .highlight {
      background: #f3f4f6;
      border-radius: 8px;
      padding: 16px;
      margin: 16px 0;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://getbruh.app'}" class="logo">
        Bruh<span>.</span>
      </a>
      ${content}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Bruh. All rights reserved.</p>
      <p>You received this email because you have an account or were invited to Bruh.</p>
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
    subject: `You've been invited to join ${teamName} on Bruh`,
    html: baseTemplate(`
      <h1>Join ${teamName}</h1>
      <p>${inviterName} has invited you to join <strong>${teamName}</strong> as a <strong>${role}</strong>.</p>

      <div class="highlight">
        <p style="margin: 0;"><strong>What you'll be able to do:</strong></p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #4b5563;">
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

      <a href="${inviteLink}" class="button">Accept Invitation</a>

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
    subject: `Welcome to Bruh!`,
    html: baseTemplate(`
      <h1>Welcome${userName ? `, ${userName}` : ''}! 🎉</h1>
      <p>Thanks for joining Bruh. We're excited to help you get focused and accomplish more.</p>

      <div class="highlight">
        <p style="margin: 0 0 8px 0;"><strong>Here's what you can do:</strong></p>
        <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
          <li>Create tasks and organize them in lists</li>
          <li>Use the Pomodoro timer to stay focused</li>
          <li>Track your habits and goals</li>
          <li>Collaborate with your team</li>
        </ul>
      </div>

      <a href="${appUrl}/today" class="button">Get Started</a>

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
    subject: `Reset your Bruh password`,
    html: baseTemplate(`
      <h1>Reset Your Password</h1>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>

      <a href="${resetLink}" class="button">Reset Password</a>

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
        ${dueDate ? `<p style="margin: 8px 0 0 0; color: #6b7280;">Due: ${dueDate}</p>` : ''}
      </div>

      <a href="${taskLink}" class="button">View Task</a>
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
    subject: `${greeting}${userName ? `, ${userName}` : ''} - Your Bruh Daily Digest`,
    html: baseTemplate(`
      <h1>${greeting}${userName ? `, ${userName}` : ''}!</h1>
      <p>Here's what's on your plate today.</p>

      ${completedYesterday > 0 ? `
        <div class="highlight" style="background: #dcfce7;">
          <p style="margin: 0; color: #166534;">🎉 You completed <strong>${completedYesterday} task${completedYesterday === 1 ? '' : 's'}</strong> yesterday!</p>
        </div>
      ` : ''}

      ${overdueTasks.length > 0 ? `
        <div class="highlight" style="background: #fef2f2;">
          <p style="margin: 0 0 8px 0; color: #991b1b;"><strong>⚠️ Overdue (${overdueTasks.length})</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #991b1b;">
            ${overdueTasks.slice(0, 5).map(t => `<li>${t.title} (${t.daysOverdue}d)</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${todayTasks.length > 0 ? `
        <div class="highlight">
          <p style="margin: 0 0 8px 0;"><strong>📋 Today's Tasks (${todayTasks.length})</strong></p>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
            ${todayTasks.slice(0, 8).map(t => `<li>${t.title}${t.time ? ` at ${t.time}` : ''}</li>`).join('')}
            ${todayTasks.length > 8 ? `<li>...and ${todayTasks.length - 8} more</li>` : ''}
          </ul>
        </div>
      ` : `
        <div class="highlight">
          <p style="margin: 0; color: #166534;">✅ No tasks scheduled for today!</p>
        </div>
      `}

      <a href="${dashboardLink}" class="button">Open Bruh</a>
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
    subject: `Your Weekly Bruh Summary`,
    html: baseTemplate(`
      <h1>Your Week in Review</h1>
      <p>Here's how you did this week${userName ? `, ${userName}` : ''}.</p>

      <div style="display: flex; gap: 16px; flex-wrap: wrap; margin: 24px 0;">
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #FF6B00;">${tasksCompleted}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Tasks Done</p>
        </div>
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #10b981;">${focusHours}h</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Focus Time</p>
        </div>
        <div class="highlight" style="flex: 1; min-width: 120px; text-align: center;">
          <p style="margin: 0; font-size: 32px; font-weight: 700; color: #f59e0b;">${streakDays}</p>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Day Streak</p>
        </div>
      </div>

      ${topProject ? `
        <p>Your most active project: <strong>${topProject}</strong></p>
      ` : ''}

      <a href="${dashboardLink}" class="button">View Full Stats</a>

      <hr class="divider">

      <p class="muted">Keep up the momentum! 💪</p>
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

    <p class="muted">This email was sent by a Bruh administrator.</p>
  `);
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
