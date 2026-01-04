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

      <main className="max-w-4xl mx-auto px-6 py-12 prose prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: January 4, 2026</p>

        <h2>Overview</h2>
        <p>
          bruh. (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, and safeguard your information when you use
          our productivity application at getbruh.app.
        </p>

        <h2>Information We Collect</h2>

        <h3>Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Email address</li>
          <li>Authentication credentials (managed securely via Supabase)</li>
        </ul>

        <h3>Task and Productivity Data</h3>
        <p>To provide our service, we store:</p>
        <ul>
          <li>Tasks, lists, and notes you create</li>
          <li>Focus session data and productivity statistics</li>
          <li>Goals and habits you track</li>
          <li>User preferences and settings</li>
        </ul>

        <h3>Billing Information</h3>
        <p>When you subscribe to our paid service, we collect:</p>
        <ul>
          <li>Payment card information (processed securely by Stripe - we never store your full card number)</li>
          <li>Billing address</li>
          <li>Transaction history</li>
          <li>Subscription status and plan details</li>
        </ul>
        <p>
          All payment processing is handled by Stripe, a PCI-DSS compliant payment processor.
          We only store a reference to your Stripe customer ID and subscription details.
        </p>

        <h3>Integration Data</h3>
        <p>If you connect third-party services (Google Calendar, Slack, Notion), we store:</p>
        <ul>
          <li>OAuth tokens to maintain the connection</li>
          <li>Sync preferences you configure</li>
          <li>Data necessary to sync between services (e.g., calendar event IDs)</li>
        </ul>
        <p>We only access the minimum data required for the integrations to function.</p>

        <h2>How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Provide and maintain our service</li>
          <li>Process subscription payments and manage your account</li>
          <li>Sync your tasks with connected third-party services</li>
          <li>Send notifications you&apos;ve opted into (e.g., Slack reminders)</li>
          <li>Send important account notifications (payment confirmations, subscription changes)</li>
          <li>Improve our service based on usage patterns (anonymized)</li>
        </ul>

        <h2>Data Storage and Security</h2>
        <p>
          Your data is stored securely using Supabase, which provides enterprise-grade security
          including encryption at rest and in transit. Payment data is processed and stored
          by Stripe using bank-level encryption. We do not sell, rent, or share your
          personal data with third parties for marketing purposes.
        </p>

        <h2>Third-Party Services</h2>
        <p>We integrate with the following services:</p>
        <ul>
          <li><strong>Supabase</strong> - Database and authentication</li>
          <li><strong>Vercel</strong> - Application hosting</li>
          <li><strong>Stripe</strong> - Payment processing</li>
          <li><strong>Google Calendar</strong> - Calendar sync (optional)</li>
          <li><strong>Slack</strong> - Notifications and commands (optional)</li>
          <li><strong>Notion</strong> - Database sync (optional)</li>
        </ul>
        <p>Each integration is opt-in and can be disconnected at any time from Settings.</p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access</strong> - Export all your data from Settings</li>
          <li><strong>Delete</strong> - Delete your account and all associated data</li>
          <li><strong>Disconnect</strong> - Remove any third-party integration at any time</li>
          <li><strong>Cancel</strong> - Cancel your subscription at any time from Settings</li>
        </ul>

        <h2>Data Retention</h2>
        <p>
          We retain your account data for as long as your account is active. Upon account deletion,
          we delete all your personal data within 30 days. We may retain anonymized, aggregated
          data for analytics purposes. Payment records may be retained as required by law for
          tax and accounting purposes.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies for authentication and session management.
          We do not use tracking cookies or third-party analytics.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any
          changes by posting the new Privacy Policy on this page and updating the
          &quot;Last updated&quot; date. For material changes affecting your data or billing,
          we will notify you via email.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>.
        </p>
      </main>
    </div>
  );
}
