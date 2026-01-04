import { Logo } from "@/components/brand/logo";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | bruh.",
  description: "Terms of Service for bruh. productivity app",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Logo size="md" showIcon={false} />
        </Link>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 prose prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: January 3, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using bruh. (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service. If you do not agree to these terms, do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          bruh. is a productivity application that helps you manage tasks, track habits,
          and stay focused. The Service includes web access and integrations with
          third-party services like Google Calendar, Slack, and Notion.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account. You must provide accurate
          information when creating your account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Upload malicious code or content</li>
          <li>Resell or redistribute the Service without permission</li>
        </ul>

        <h2>5. Your Content</h2>
        <p>
          You retain ownership of all content you create in the Service (tasks, notes, etc.).
          By using the Service, you grant us a license to store, process, and display your
          content as necessary to provide the Service.
        </p>

        <h2>6. Third-Party Integrations</h2>
        <p>
          The Service may integrate with third-party services. Your use of these integrations
          is also subject to the terms and privacy policies of those third parties. We are
          not responsible for third-party services.
        </p>

        <h2>7. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted access
          to the Service. We may modify, suspend, or discontinue features at any time.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We are not
          liable for any indirect, incidental, special, or consequential damages arising
          from your use of the Service.
        </p>

        <h2>9. Termination</h2>
        <p>
          You may delete your account at any time from Settings. We may terminate or
          suspend your account if you violate these Terms. Upon termination, your right
          to use the Service ceases immediately.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use of the Service after
          changes constitutes acceptance of the new Terms.
        </p>

        <h2>11. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the United States, without regard to
          conflict of law principles.
        </p>

        <h2>12. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@getbruh.app">legal@getbruh.app</a>.
        </p>
      </main>
    </div>
  );
}
