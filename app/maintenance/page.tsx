import { Logo } from "@/components/brand/logo";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <Logo size="lg" />

        <div className="flex items-center justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Wrench className="h-12 w-12 text-primary" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">We'll be right back</h1>
          <p className="text-muted-foreground">
            bruh. is currently undergoing scheduled maintenance.
            We're working to improve your experience and will be back shortly.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Thank you for your patience!
        </p>
      </div>
    </div>
  );
}
