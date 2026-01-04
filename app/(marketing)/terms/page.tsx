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
        <p className="text-muted-foreground">Last updated: January 4, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account or using bruh. (&quot;the Service&quot;), you agree to be bound by these
          Terms of Service and our Privacy Policy. If you do not agree to these terms, do not use the Service.
          By clicking &quot;Create account&quot; or using the Service, you acknowledge that you have read,
          understood, and agree to be bound by these Terms.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          bruh. is a productivity application that helps you manage tasks, track habits,
          and stay focused. The Service includes web access, integrations with
          third-party services like Google Calendar, Slack, and Notion, and premium features
          available through paid subscriptions.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for all activities that occur under your account. You must provide accurate
          information when creating your account. You must be at least 13 years old to use
          the Service.
        </p>

        <h2>4. Free Trial</h2>
        <p>
          New users receive a 30-day free trial with full access to all features. No payment
          information is required during the trial period. After your trial expires, you will
          need to subscribe to continue using the Service.
        </p>

        <h2>5. Subscription and Billing</h2>
        <h3>Pricing</h3>
        <p>
          The Service is offered as a monthly subscription at $19.99/month. Prices are subject
          to change with 30 days notice to existing subscribers.
        </p>

        <h3>Billing Cycle</h3>
        <p>
          Subscriptions are billed monthly on the anniversary of your subscription start date.
          You authorize us to charge your payment method on a recurring basis until you cancel.
        </p>

        <h3>Payment Processing</h3>
        <p>
          All payments are processed securely by Stripe. By subscribing, you also agree to
          Stripe&apos;s terms of service. We do not store your full payment card information.
        </p>

        <h3>Failed Payments</h3>
        <p>
          If a payment fails, we will attempt to charge your payment method again. After
          multiple failed attempts, your subscription may be suspended until payment is resolved.
        </p>

        <h2>6. Refund Policy</h2>
        <p className="font-semibold">
          ALL SALES ARE FINAL. NO REFUNDS WILL BE ISSUED UNDER ANY CIRCUMSTANCES.
        </p>
        <p>
          By subscribing to the Service, you acknowledge and agree that:
        </p>
        <ul>
          <li>All subscription payments are non-refundable</li>
          <li>No partial refunds will be given for unused portions of a billing period</li>
          <li>No refunds will be issued for any reason, including but not limited to: dissatisfaction with the Service, failure to use the Service, or accidental purchases</li>
          <li>Cancellation of your subscription will stop future charges but will not result in a refund of any previous payments</li>
        </ul>
        <p>
          We strongly encourage you to use the full 30-day free trial to evaluate the Service
          before subscribing. The trial period provides complete access to all features,
          allowing you to make an informed decision.
        </p>

        <h2>7. Cancellation</h2>
        <p>
          You may cancel your subscription at any time from the Settings page. Upon cancellation:
        </p>
        <ul>
          <li>You will retain access to the Service until the end of your current billing period</li>
          <li>No future charges will be made</li>
          <li>No refunds will be issued for the current or any previous billing periods</li>
          <li>Your data will be retained and accessible if you resubscribe within 90 days</li>
        </ul>

        <h2>8. Promotional Codes</h2>
        <p>
          Promotional codes, when offered, are subject to specific terms and conditions.
          Codes are non-transferable, cannot be combined, and may expire. Abuse of promotional
          codes may result in account termination.
        </p>

        <h2>9. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose</li>
          <li>Attempt to gain unauthorized access to our systems</li>
          <li>Interfere with or disrupt the Service</li>
          <li>Upload malicious code or content</li>
          <li>Resell, redistribute, or share your account without permission</li>
          <li>Create multiple accounts to abuse free trials or promotions</li>
          <li>Use automated tools to access the Service without permission</li>
        </ul>

        <h2>10. Your Content</h2>
        <p>
          You retain ownership of all content you create in the Service (tasks, notes, etc.).
          By using the Service, you grant us a license to store, process, and display your
          content as necessary to provide the Service.
        </p>

        <h2>11. Third-Party Integrations</h2>
        <p>
          The Service may integrate with third-party services. Your use of these integrations
          is also subject to the terms and privacy policies of those third parties. We are
          not responsible for third-party services.
        </p>

        <h2>12. Service Availability</h2>
        <p>
          We strive to maintain high availability but do not guarantee uninterrupted access
          to the Service. We may modify, suspend, or discontinue features at any time.
          Planned maintenance will be announced in advance when possible.
        </p>

        <h2>13. Limitation of Liability</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE ARE NOT LIABLE FOR ANY INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF
          THE SERVICE, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, PROFITS, OR BUSINESS OPPORTUNITIES.
        </p>
        <p>
          OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICE
          SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
        </p>

        <h2>14. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless bruh. and its officers, directors, employees,
          and agents from any claims, damages, or expenses arising from your use of the Service
          or violation of these Terms.
        </p>

        <h2>15. Termination</h2>
        <p>
          You may delete your account at any time from Settings. We may terminate or
          suspend your account immediately if you violate these Terms. Upon termination,
          your right to use the Service ceases immediately and no refunds will be issued.
        </p>

        <h2>16. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of material changes
          via email or through the Service. Continued use of the Service after changes
          constitutes acceptance of the new Terms.
        </p>

        <h2>17. Dispute Resolution</h2>
        <p>
          Any disputes arising from these Terms or your use of the Service shall be resolved
          through binding arbitration in accordance with the rules of the American Arbitration
          Association. You waive any right to participate in a class action lawsuit or
          class-wide arbitration.
        </p>

        <h2>18. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the United States, without regard to
          conflict of law principles.
        </p>

        <h2>19. Severability</h2>
        <p>
          If any provision of these Terms is found to be unenforceable, the remaining
          provisions will continue in full force and effect.
        </p>

        <h2>20. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@getbruh.app">legal@getbruh.app</a>.
        </p>
      </main>
    </div>
  );
}
