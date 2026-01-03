"use client";

import { useState } from "react";
import { Calendar, Check, ExternalLink, Loader2, Unlink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface GoogleCalendarSettingsProps {
  integration: {
    id: string;
    provider_email: string;
    settings: {
      calendar_id?: string;
      calendar_name?: string;
      sync_tasks_to_calendar?: boolean;
      sync_completed_tasks?: boolean;
    };
    sync_enabled: boolean;
    last_sync_at: string | null;
  } | null;
}

export function GoogleCalendarSettings({ integration }: GoogleCalendarSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(integration?.sync_enabled ?? false);

  async function handleDisconnect() {
    if (!confirm("Disconnect Google Calendar? Your synced events won't be deleted from your calendar.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/google/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();

      toast.success("Disconnected from Google Calendar");
      window.location.reload();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleToggleSync(enabled: boolean) {
    setSyncEnabled(enabled);
    try {
      const res = await fetch("/api/integrations/google/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_enabled: enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? "Sync enabled" : "Sync paused");
    } catch {
      setSyncEnabled(!enabled);
      toast.error("Failed to update settings");
    }
  }

  if (!integration) {
    // Not connected state
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar
          </CardTitle>
          <CardDescription>
            Sync your tasks with Google Calendar. Tasks with due dates appear as events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/integrations/google/connect">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Connect Google Calendar
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            We only access your calendar events. No spam. No bullshit.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
          <span className="ml-auto flex items-center gap-1.5 text-sm font-normal text-green-500">
            <Check className="h-4 w-4" />
            Connected
          </span>
        </CardTitle>
        <CardDescription>
          Syncing with {integration.provider_email}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium text-sm">{integration.settings.calendar_name || "Primary Calendar"}</p>
            <p className="text-xs text-muted-foreground">
              {integration.last_sync_at
                ? `Last synced ${new Date(integration.last_sync_at).toLocaleString()}`
                : "Not synced yet"}
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://calendar.google.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* Sync settings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sync-enabled">Enable Sync</Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync tasks to calendar
              </p>
            </div>
            <Switch
              id="sync-enabled"
              checked={syncEnabled}
              onCheckedChange={handleToggleSync}
            />
          </div>
        </div>

        {/* Disconnect */}
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={handleDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4 mr-2" />
            )}
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
