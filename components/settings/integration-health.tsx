"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface HealthStatus {
  provider: string;
  connected: boolean;
  healthy: boolean;
  error?: string;
  lastSync?: string | null;
}

const providerNames: Record<string, string> = {
  google_calendar: "Google Calendar",
  slack: "Slack",
  notion: "Notion",
};

export function IntegrationHealth() {
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function checkHealth() {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/integrations/health");
      const data = await res.json();
      if (data.health) {
        setHealth(data.health);
      }
    } catch {
      toast.error("Failed to check health");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  const connectedIntegrations = health.filter((h) => h.connected);
  const unhealthyCount = connectedIntegrations.filter((h) => !h.healthy).length;

  if (isLoading) {
    return null;
  }

  if (connectedIntegrations.length === 0) {
    return null;
  }

  return (
    <Card className={unhealthyCount > 0 ? "border-destructive/50" : "border-green-500/50"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {unhealthyCount > 0 ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            <CardTitle className="text-base">Integration Health</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={checkHealth}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>
          {unhealthyCount > 0
            ? `${unhealthyCount} integration${unhealthyCount > 1 ? "s" : ""} need attention`
            : "All integrations are working"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {connectedIntegrations.map((status) => (
            <div
              key={status.provider}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-2">
                {status.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="text-sm font-medium">
                  {providerNames[status.provider] || status.provider}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {status.healthy ? (
                  status.lastSync ? (
                    `Last sync: ${new Date(status.lastSync).toLocaleDateString()}`
                  ) : (
                    "Connected"
                  )
                ) : (
                  <span className="text-destructive">{status.error}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
