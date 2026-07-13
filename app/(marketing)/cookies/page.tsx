import { Logo } from "@/components/brand/logo";
import Link from "next/link";

export const metadata = {
  title: "Cookie Policy | bruh.",
  description: "How bruh. uses cookies and similar technologies. We keep it minimal — essential cookies only, no ad tracking.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between p-6 max-w-4xl mx-auto">
        <Link href="/">
          <Logo size="md" showIcon={false} />
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 prose">
        <h1>Cookie Policy</h1>
        <p className="text-muted-foreground">Last updated: July 12, 2026</p>

        <h2>The short version</h2>
        <p>
          bruh. uses only the cookies it needs to keep you signed in and to remember your
          preferences. We don&apos;t use advertising cookies, we don&apos;t sell your data, and we
          don&apos;t run third-party trackers that follow you around the web. If you have questions,
          email us at <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>.
        </p>

        <h2>What cookies are</h2>
        <p>
          Cookies are small text files a website stores in your browser. Some are essential (the site
          can&apos;t work without them), and some remember your settings so you don&apos;t have to set
          them again. &quot;Similar technologies&quot; means things like browser local storage, which
          we also use to save preferences on your device.
        </p>

        <h2>Cookies we use</h2>
        <h3>Strictly necessary</h3>
        <p>
          These keep you logged in and secure. They&apos;re set when you sign in and are required for
          the app to function — you can&apos;t turn them off and still use bruh.
        </p>
        <ul>
          <li>
            <strong>Authentication &amp; session</strong> — set by our auth provider to keep you
            signed in and protect against cross-site request forgery.
          </li>
        </ul>

        <h3>Functional (preferences)</h3>
        <p>
          These remember choices you make so the app behaves the way you like. Most are stored in your
          browser&apos;s local storage rather than as cookies.
        </p>
        <ul>
          <li>
            <strong>Theme &amp; UI preferences</strong> — e.g. dark/light mode, focus-timer settings,
            and dismissed prompts.
          </li>
        </ul>

        <h2>What we don&apos;t use</h2>
        <ul>
          <li><strong>No advertising cookies.</strong> We don&apos;t run ads or ad networks.</li>
          <li>
            <strong>No third-party ad tracking.</strong> We don&apos;t share your browsing with data
            brokers or ad platforms.
          </li>
          <li>
            <strong>Privacy-friendly analytics.</strong> We measure aggregate, anonymous usage to
            improve the product using cookieless analytics — no personal profiles.
          </li>
          <li>
            <strong>Error monitoring.</strong> We use a diagnostics tool to catch crashes and fix bugs;
            it is not used to track or advertise to you.
          </li>
        </ul>

        <h2>Managing cookies</h2>
        <p>
          You can clear or block cookies in your browser settings at any time. Blocking the strictly
          necessary cookies will sign you out and prevent bruh. from working. Clearing local storage
          resets your saved preferences. For a full list of the data we process and your rights over
          it, see our <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Cookie Policy from time to time. We&apos;ll post the new version here and
          update the &quot;Last updated&quot; date above.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about cookies or your data? Email{" "}
          <a href="mailto:privacy@getbruh.app">privacy@getbruh.app</a>.
        </p>
      </main>
    </div>
  );
}
