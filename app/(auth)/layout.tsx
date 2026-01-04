import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link
        href="/"
        className="mb-8 hover:opacity-80 transition-opacity"
      >
        <Logo size="lg" showIcon={false} />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Get your shit together.
      </p>
    </div>
  );
}
