import { Target } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link
        href="/"
        className="flex items-center gap-2 mb-8 text-foreground hover:opacity-80 transition-opacity"
      >
        <Target className="h-8 w-8 text-primary" />
        <span className="text-2xl font-semibold">Zeroed</span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Zero in. Get it done.
      </p>
    </div>
  );
}
