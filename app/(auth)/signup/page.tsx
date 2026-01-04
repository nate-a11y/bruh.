import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getPlatformSetting } from "@/lib/platform-settings";
import { Logo } from "@/components/brand/logo";
import Link from "next/link";

export default async function SignupPage() {
  const signupsEnabled = await getPlatformSetting("signups_enabled");

  if (!signupsEnabled) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <Logo size="lg" />

          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Signups Temporarily Closed</h1>
            <p className="text-muted-foreground">
              We're not accepting new signups at the moment.
              Please check back later or contact us if you have questions.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-block text-primary hover:underline"
          >
            Already have an account? Log in
          </Link>
        </div>
      </div>
    );
  }

  return <SignupForm />;
}
