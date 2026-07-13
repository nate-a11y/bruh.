import { Logo } from "@/components/brand/logo";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | bruh.",
  description: "Privacy Policy for bruh. productivity app",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Logo size="md" showIcon={false} />
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 prose">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: July 12, 2026</p>

        <h2>Overview</h2>
        <p>
          bruh. (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is an AI-powered task manager and focus
          app operated by Elite LOZ Transportation, LLC (d/b/a getBruh.app), based in Missouri, USA. We care about your privacy and
          keep things simple: you own your data, we don&apos;t sell it, and we only collect what we need
          to run the Service at getbruh.app.
        </p>
        <p>
          This Privacy Policy explains what we collect, how we use it, who we share it with, and the
          rights you have over your information. If anything here is unclear, email us at{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>.
        </p>

        <h2>Who This Policy Covers</h2>
        <p>
          This policy applies to everyone who uses bruh., including visitors, free-tier users, and paid
          subscribers, wherever you are in the world. If you are in the European Economic Area (EEA),
          the United Kingdom, or California, additional rights described below apply to you.
        </p>

        <h2>Information We Collect</h2>

        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Display name (if you choose to provide one)</li>
          <li>
            A securely hashed password (authentication is handled by Supabase Auth; we never see or
            store your password in plain text)
          </li>
        </ul>

        <h3>Your Content</h3>
        <p>To provide the Service, we store the content you create, which may include:</p>
        <ul>
          <li>Tasks, notes, lists, and projects</li>
          <li>Goals and habits you track</li>
          <li>Focus session data and productivity statistics</li>
          <li>User preferences and settings</li>
        </ul>
        <p>
          This content is yours. We only access it as needed to operate, secure, and support the
          Service, or as you direct (for example, when you use an AI or integration feature).
        </p>

        <h3>Usage and Device Data</h3>
        <p>
          When you use bruh., we automatically collect limited technical data needed to run and secure
          the Service, such as:
        </p>
        <ul>
          <li>Device and browser type, operating system, and general settings</li>
          <li>IP address and approximate location derived from it</li>
          <li>Log data, feature usage, and error/diagnostic reports</li>
        </ul>

        <h3>Payment Information</h3>
        <p>When you subscribe to a paid plan, payments are handled by Stripe. On our side we store:</p>
        <ul>
          <li>A reference to your Stripe customer ID</li>
          <li>Subscription status, plan, and billing period</li>
          <li>Transaction and invoice history metadata</li>
        </ul>
        <p>
          Your full payment card number is collected and processed directly by Stripe, a PCI-DSS
          compliant payment processor. bruh. never receives or stores your full card number.
        </p>

        <h3>Integration Data</h3>
        <p>
          If you connect an optional third-party service (Google Calendar, Notion, or Slack), we store:
        </p>
        <ul>
          <li>OAuth tokens needed to maintain the connection</li>
          <li>Sync preferences you configure</li>
          <li>The minimum data required to sync between services (e.g., calendar event IDs)</li>
        </ul>
        <p>Each integration is opt-in and can be disconnected at any time from Settings.</p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide, maintain, and improve the Service</li>
          <li>Create and manage your account</li>
          <li>Process subscription payments and manage billing</li>
          <li>Power AI features you choose to use (see below)</li>
          <li>Sync your tasks with connected third-party services</li>
          <li>Send transactional email (account, billing, and security notices) and notifications you opt into</li>
          <li>Monitor for errors, prevent abuse, and keep the Service secure</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>AI Features</h2>
        <p>
          bruh. includes AI-assisted features such as brain-dump capture and planning. When you use
          these features, the relevant text you submit (and the context needed to process it) is sent
          to our AI provider, Anthropic (Claude), to generate a response. We only send what is needed
          to perform the requested task. AI output can be inaccurate or incomplete, so please review it
          before relying on it. We do not use your content to train third-party AI models.
        </p>

        <h2>Subprocessors and Third-Party Services</h2>
        <p>
          We rely on a small set of trusted service providers (&quot;subprocessors&quot;) to run bruh.
          Each processes data only as needed to provide their service to us:
        </p>
        <ul>
          <li><strong>Supabase</strong> — database, authentication, and hosting of your data</li>
          <li><strong>Vercel</strong> — application hosting and delivery</li>
          <li><strong>Stripe</strong> — payment processing and subscription billing</li>
          <li><strong>Anthropic (Claude)</strong> — AI brain-dump and planning features (your submitted text may be sent to process AI features)</li>
          <li><strong>Google</strong> — optional Google Calendar integration via OAuth</li>
          <li><strong>Notion</strong> — optional Notion integration (opt-in)</li>
          <li><strong>Slack</strong> — optional Slack integration and notifications (opt-in)</li>
          <li><strong>Resend</strong> — transactional email delivery</li>
          <li><strong>Upstash</strong> — rate limiting and abuse prevention</li>
          <li><strong>Sentry</strong> — error monitoring and diagnostics</li>
        </ul>
        <p>
          This list functions as our current subprocessors list. We may update it as our providers
          change; material changes will be reflected here. For an up-to-date list, contact{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>.
        </p>
        <p>
          We do not sell, rent, or share your personal data with third parties for their own marketing
          purposes.
        </p>

        <h2>Legal Bases for Processing (EEA / UK)</h2>
        <p>
          If you are in the EEA or UK, we process your personal data under the following lawful bases of
          the GDPR / UK GDPR:
        </p>
        <ul>
          <li><strong>Contract</strong> — to provide the Service you sign up for and process payments</li>
          <li><strong>Legitimate interests</strong> — to secure, maintain, and improve the Service and prevent abuse</li>
          <li><strong>Consent</strong> — for optional integrations and communications you opt into (you can withdraw consent at any time)</li>
          <li><strong>Legal obligation</strong> — to meet tax, accounting, and other legal requirements</li>
        </ul>

        <h2>Your Rights</h2>
        <p>Depending on where you live, you may have some or all of the following rights:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of the personal data we hold about you, and export your data from Settings</li>
          <li><strong>Rectify</strong> — correct inaccurate or incomplete data</li>
          <li><strong>Erase</strong> — delete your account and associated data</li>
          <li><strong>Portability</strong> — receive your data in a portable, machine-readable format</li>
          <li><strong>Object / Restrict</strong> — object to or restrict certain processing</li>
          <li><strong>Withdraw consent</strong> — disconnect any integration or opt out of optional communications at any time</li>
        </ul>
        <p>
          To exercise any of these rights, use the in-app Settings or email{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>. We will not discriminate against
          you for exercising your rights. EEA/UK users also have the right to lodge a complaint with
          their local data protection authority.
        </p>

        <h2>California Privacy Rights (CCPA / CPRA)</h2>
        <p>
          If you are a California resident, you have the right to know what personal information we
          collect and how we use it, to request deletion of your personal information, and to opt out of
          the &quot;sale&quot; or &quot;sharing&quot; of personal information. bruh. does not sell your
          personal information, and we do not share it for cross-context behavioral advertising. You may
          exercise your rights via Settings or by emailing{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>, and we will not discriminate
          against you for doing so.
        </p>

        <h2>International Data Transfers</h2>
        <p>
          bruh. is operated from the United States, and your data is processed and stored in the U.S. and
          other countries where our subprocessors operate. If you access the Service from outside the
          U.S., your information will be transferred to and processed in the U.S. Where required, we rely
          on appropriate safeguards for these transfers, such as the European Commission&apos;s Standard
          Contractual Clauses (SCCs) or equivalent mechanisms.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your account and content data for as long as your account is active. When you delete
          your account, we delete your personal data within 30 days, except where we are required to
          retain certain records (such as payment and tax records) to comply with law. We may keep
          anonymized, aggregated data that no longer identifies you.
        </p>

        <h2>Data Deletion</h2>
        <p>
          You can delete your account and all associated data at any time from in-app Settings, which
          removes your content from our systems. If you need help or prefer to request deletion by email,
          contact <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a> and we will process your
          request.
        </p>

        <h2>Data Security</h2>
        <p>
          Your data is stored using Supabase, which provides encryption in transit and at rest, and
          payment data is handled by Stripe using bank-level encryption. We use reasonable technical and
          organizational measures to protect your information. No system is perfectly secure, so we
          cannot guarantee absolute security, but we work to protect your data and to notify you of any
          breach as required by law.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only essential cookies for authentication and session management. We do not use
          advertising or third-party tracking cookies, and we do not run third-party analytics. Our
          error-monitoring provider (Sentry) is used for diagnostics only, not advertising or behavioral
          tracking.
        </p>

        <h2>Children&apos;s Privacy</h2>
        <p>
          bruh. is not directed to children, and we do not knowingly collect personal information from
          anyone under 13 (or under 16 where a higher age applies under local law). If you believe a
          child has provided us personal information, contact us and we will delete it.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the updated policy on this
          page and revise the &quot;Last updated&quot; date. For material changes affecting your data or
          billing, we will notify you by email.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or how we handle your data, contact us at{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a> or by mail at Elite LOZ
          Transportation, LLC, Rocky Mount, Missouri, USA.
        </p>
      </main>
    </div>
  );
}
