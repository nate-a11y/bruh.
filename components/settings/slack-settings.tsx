"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, MessageSquare, Unlink, RefreshCw, Hash, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Json } from "@/lib/supabase/types";

interface SlackSettingsProps {
  integration: {
    id: string;
    settings: Json;
    sync_enabled: boolean;
  } | null;
}

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
}

// Helper to safely access settings from Json type
function getSettingsValue<T>(settings: Json, key: string, defaultValue: T): T {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return defaultValue;
  const value = (settings as Record<string, unknown>)[key];
  return (value as T) ?? defaultValue;
}

export function SlackSettings({ integration }: SlackSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<string>(
    getSettingsValue(integration?.settings ?? null, "notification_channel_id", "dm")
  );
  const [notifyTaskDue, setNotifyTaskDue] = useState(
    getSettingsValue(integration?.settings ?? null, "notify_task_due", true)
  );
  const [notifyDailySummary, setNotifyDailySummary] = useState(
    getSettingsValue(integration?.settings ?? null, "notify_daily_summary", true)
  );
  const [notifyTaskCreated, setNotifyTaskCreated] = useState(
    getSettingsValue(integration?.settings ?? null, "notify_task_created", false)
  );
  const [notifyTaskCompleted, setNotifyTaskCompleted] = useState(
    getSettingsValue(integration?.settings ?? null, "notify_task_completed", false)
  );

  useEffect(() => {
    if (integration) {
      fetchChannels();
    }
  }, [integration]);

  async function fetchChannels() {
    setIsLoadingChannels(true);
    try {
      const res = await fetch("/api/integrations/slack/channels");
      const data = await res.json();
      if (data.channels) {
        setChannels(data.channels);
      }
    } catch {
      // Silent fail - channels list is optional
    } finally {
      setIsLoadingChannels(false);
    }
  }

  async function handleChannelSelect(channelId: string) {
    setSelectedChannel(channelId);
    const channel = channels.find(c => c.id === channelId);
    await updateSettings({
      notification_channel_id: channelId,
      notification_channel_name: channelId === "dm" ? "Direct Message" : channel?.name || "Unknown",
    });
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Slack? You won't receive notifications anymore.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/slack/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();

      toast.success("Disconnected from Slack");
      window.location.reload();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function updateSettings(settings: Record<string, unknown>) {
    try {
      const res = await fetch("/api/integrations/slack/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
  }

  if (!integration) {
    // Not connected state
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Slack
          </CardTitle>
          <CardDescription>
            Get task notifications and add tasks with /bruh commands.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/integrations/slack/connect">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              Connect Slack
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Use /bruh commands and get task reminders in Slack.
          </p>
        </CardContent>
      </Card>
    );
  }

  const teamName = getSettingsValue(integration.settings, "team_name", "Slack Workspace");

  // Connected state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Slack
          <span className="ml-auto flex items-center gap-1.5 text-sm font-normal text-green-500">
            <Check className="h-4 w-4" />
            Connected
          </span>
        </CardTitle>
        <CardDescription>Connected to {teamName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Notification Channel Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Notification Channel</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchChannels}
              disabled={isLoadingChannels}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingChannels ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Select value={selectedChannel} onValueChange={handleChannelSelect}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingChannels ? "Loading..." : "Select where to send notifications"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dm">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-3 w-3" />
                  <span>Direct Message (DM)</span>
                </span>
              </SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <span className="flex items-center gap-2">
                    {channel.is_private ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Hash className="h-3 w-3" />
                    )}
                    <span>{channel.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Where you&apos;ll receive task reminders and summaries
          </p>
        </div>

        {/* Slash commands info */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-sm mb-2">Slash Commands</p>
          <div className="text-xs text-muted-foreground space-y-1 font-mono">
            <p>/bruh today - See today&apos;s tasks</p>
            <p>/bruh add [task] - Add a task</p>
            <p>/bruh done [task] - Complete a task</p>
          </div>
        </div>

        {/* Notification settings */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-due">Task Due Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when tasks are due
              </p>
            </div>
            <Switch
              id="notify-due"
              checked={notifyTaskDue}
              onCheckedChange={(checked) => {
                setNotifyTaskDue(checked);
                updateSettings({ notify_task_due: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-summary">Daily Summary</Label>
              <p className="text-xs text-muted-foreground">
                Morning summary of today&apos;s tasks
              </p>
            </div>
            <Switch
              id="notify-summary"
              checked={notifyDailySummary}
              onCheckedChange={(checked) => {
                setNotifyDailySummary(checked);
                updateSettings({ notify_daily_summary: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-created">Task Created</Label>
              <p className="text-xs text-muted-foreground">
                Get notified when you add a task
              </p>
            </div>
            <Switch
              id="notify-created"
              checked={notifyTaskCreated}
              onCheckedChange={(checked) => {
                setNotifyTaskCreated(checked);
                updateSettings({ notify_task_created: checked });
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify-completed">Task Completed</Label>
              <p className="text-xs text-muted-foreground">
                Celebrate when you finish a task
              </p>
            </div>
            <Switch
              id="notify-completed"
              checked={notifyTaskCompleted}
              onCheckedChange={(checked) => {
                setNotifyTaskCompleted(checked);
                updateSettings({ notify_task_completed: checked });
              }}
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
