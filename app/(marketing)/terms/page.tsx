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

      <main className="max-w-3xl mx-auto px-6 py-12 prose">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: July 12, 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) are a legal agreement between you and [Company Legal
          Name] (&quot;bruh.&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), the company that
          operates bruh. (&quot;the Service&quot;) at getbruh.app. By creating an account or using the
          Service, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the
          Service.
        </p>

        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old to use the Service (or older where your country requires a
          higher minimum age). If you use the Service on behalf of an organization, you represent that
          you are authorized to accept these Terms on its behalf.
        </p>

        <h2>3. Description of Service</h2>
        <p>
          bruh. is an AI-powered task manager and focus app that helps you capture tasks, plan your
          work, track goals and habits, and stay focused. The Service includes web access, optional
          AI features, optional integrations with third-party services (such as Google Calendar, Notion,
          and Slack), and premium features available through paid subscriptions.
        </p>

        <h2>4. Your Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for
          all activity under your account. You agree to provide accurate information and to keep it up to
          date. Notify us promptly at{" "}
          <a href="mailto:legal@getbruh.app">legal@getbruh.app</a> if you suspect unauthorized use of
          your account.
        </p>

        <h2>5. Plans, Subscriptions, and Billing</h2>
        <h3>Plans</h3>
        <p>The Service is offered on the following plans:</p>
        <ul>
          <li><strong>Free</strong> — a free tier with limited features, at no cost</li>
          <li><strong>Pro</strong> — $19.99 per month</li>
          <li>
            <strong>Team</strong> — $19.99 per month base, plus $12 per month for each additional team
            member
          </li>
        </ul>

        <h3>Payment Processing</h3>
        <p>
          Paid subscriptions are billed through Stripe. By subscribing, you authorize us and Stripe to
          charge your payment method, and you agree to Stripe&apos;s terms of service. We do not store
          your full payment card information.
        </p>

        <h3>Auto-Renewal</h3>
        <p>
          Paid subscriptions are billed monthly in advance and renew automatically each month until you
          cancel. You authorize recurring charges to your payment method for the plan you select
          (including per-member charges for Team plans) until cancellation.
        </p>

        <h3>Cancellation</h3>
        <p>
          You may cancel your subscription at any time from the Settings page. When you cancel, you keep
          access to paid features until the end of your current billing period, and no further charges
          will be made after that. The free tier remains available to you.
        </p>

        <h3>Refunds</h3>
        <p>
          Except where required by applicable law, payments are non-refundable and we do not provide
          refunds or credits for partial billing periods or unused time. If the law in your jurisdiction
          gives you a right to a refund, that right still applies and these Terms do not override it.
        </p>

        <h3>Price Changes</h3>
        <p>
          We may change our prices from time to time. If we change the price of a plan you subscribe to,
          we will give you at least 30 days&apos; notice, and the new price will take effect on your
          next billing cycle after the notice period. Your continued use after the change takes effect
          constitutes acceptance of the new price.
        </p>

        <h3>Taxes</h3>
        <p>
          Prices shown do not necessarily include taxes. You are responsible for any applicable sales,
          use, VAT, or similar taxes, which may be added to your charges where required.
        </p>

        <h3>Failed Payments</h3>
        <p>
          If a payment fails, we may retry the charge. If payment cannot be collected, we may suspend or
          downgrade your access to paid features until the balance is resolved.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful, harmful, or fraudulent purpose</li>
          <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
          <li>Interfere with, disrupt, or overload the Service</li>
          <li>Upload or transmit malicious code or content</li>
          <li>Resell, redistribute, or share your account without our permission</li>
          <li>Use automated tools to access the Service except as we expressly permit</li>
          <li>Infringe the intellectual property or privacy rights of others</li>
        </ul>

        <h2>7. Your Content</h2>
        <p>
          You retain full ownership of the content you create in the Service (tasks, notes, projects,
          goals, habits, and similar). You grant bruh. a limited, non-exclusive license to host, store,
          process, and display your content solely as needed to operate and provide the Service to you,
          including sending content you submit to AI or integration providers when you use those
          features. This license ends when you delete your content or account, except for backups or
          records we are required to keep.
        </p>

        <h2>8. AI Features</h2>
        <p>
          The Service includes AI-assisted features. AI-generated output may be inaccurate, incomplete,
          or unsuitable for your situation, and you are responsible for reviewing it before relying on
          it. bruh. is not liable for decisions you make based on AI output. See our Privacy Policy for
          how AI features process your content.
        </p>

        <h2>9. Third-Party Integrations</h2>
        <p>
          The Service may integrate with third-party services. Your use of those services is governed by
          their own terms and privacy policies, and we are not responsible for third-party services,
          their availability, or their content. Enabling an integration is at your discretion.
        </p>

        <h2>10. Service Availability</h2>
        <p>
          We work to keep the Service available and reliable but do not guarantee uninterrupted or
          error-free access. We may modify, suspend, or discontinue features at any time. When possible,
          we will announce planned maintenance in advance.
        </p>

        <h2>11. Warranty Disclaimer</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF
          ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS
          FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
          UNINTERRUPTED, SECURE, OR ERROR-FREE. SOME JURISDICTIONS DO NOT ALLOW CERTAIN WARRANTY
          EXCLUSIONS, SO SOME OF THESE MAY NOT APPLY TO YOU.
        </p>

        <h2>12. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, bruh. AND ITS OWNERS AND PERSONNEL WILL NOT BE LIABLE
          FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
          DATA, PROFITS, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM OR RELATING TO THE SERVICE WILL NOT EXCEED THE
          GREATER OF THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR USD $50. SOME
          JURISDICTIONS DO NOT ALLOW CERTAIN LIABILITY LIMITATIONS, SO SOME OF THESE MAY NOT APPLY TO
          YOU.
        </p>

        <h2>13. Indemnification</h2>
        <p>
          You agree to indemnify and hold harmless bruh. and its owners, personnel, and agents from any
          claims, damages, losses, or expenses (including reasonable legal fees) arising from your use of
          the Service, your content, or your violation of these Terms.
        </p>

        <h2>14. Termination</h2>
        <p>
          You may stop using the Service and delete your account at any time from Settings. We may
          suspend or terminate your access if you violate these Terms or if required by law. On
          termination, your right to use the Service ends, and sections that by their nature should
          survive (such as content ownership, disclaimers, limitations of liability, and governing law)
          will remain in effect.
        </p>

        <h2>15. Governing Law and Venue</h2>
        <p>
          These Terms are governed by the laws of the State of Missouri, USA, without regard to its
          conflict-of-law principles. Subject to the dispute resolution section below, you agree that
          the state and federal courts located in Missouri will have exclusive jurisdiction over any
          disputes, and you consent to venue there.
        </p>

        <h2>16. Dispute Resolution</h2>
        <p>
          <strong>Informal resolution first.</strong> If you have a dispute with us, please contact{" "}
          <a href="mailto:legal@getbruh.app">legal@getbruh.app</a> first so we can try to resolve it
          informally. We will work in good faith to resolve most concerns this way within 60 days.
        </p>
        <p>
          <strong>Arbitration (optional placeholder).</strong> [If the owner elects to require
          arbitration: Any dispute not resolved informally may be resolved through binding arbitration on
          an individual basis under the rules of the American Arbitration Association, and you and bruh.
          waive the right to a jury trial and to participate in a class action. Consult a lawyer before
          adopting this clause, as arbitration and class-waiver terms are subject to specific legal
          requirements.] If no arbitration clause is adopted, disputes will be resolved in the courts
          identified in the Governing Law and Venue section.
        </p>

        <h2>17. International Users</h2>
        <p>
          The Service is operated from the United States. If you access it from outside the U.S., you are
          responsible for complying with your local laws, and you consent to your information being
          processed in the U.S. as described in our Privacy Policy. Nothing in these Terms removes any
          mandatory consumer-protection rights you have under the laws of your country.
        </p>

        <h2>18. Changes to These Terms</h2>
        <p>
          We may update these Terms from time to time. We will post the updated Terms here and revise the
          &quot;Last updated&quot; date, and we will notify you of material changes by email or through
          the Service. Your continued use after changes take effect constitutes acceptance of the updated
          Terms.
        </p>

        <h2>19. Severability</h2>
        <p>
          If any provision of these Terms is found unenforceable, the remaining provisions will continue
          in full force and effect.
        </p>

        <h2>20. Contact</h2>
        <p>
          For questions about these Terms, contact us at{" "}
          <a href="mailto:legal@getbruh.app">legal@getbruh.app</a>, or by mail at Elite LOZ
          Transportation, LLC, Rocky Mount, Missouri, USA.
        </p>
      </main>
    </div>
  );
}
