import { Header } from "@/components/dashboard/header";
import { FocusInsights } from "@/components/insights/focus-insights";

export default function InsightsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Focus Insights" subtitle="Your focus patterns, last 30 days" />

      <div className="flex-1 overflow-auto p-4 md:p-6">
        <FocusInsights />
      </div>
    </div>
  );
}
