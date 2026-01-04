"use client";

import { useState, useEffect } from "react";
import { Check, Loader2, Unlink, FileText, RefreshCw, Database, Play } from "lucide-react";
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

interface NotionSettingsProps {
  integration: {
    id: string;
    settings: Json;
    sync_enabled: boolean;
    last_sync_at: string | null;
  } | null;
}

interface NotionDatabase {
  id: string;
  title: string;
  icon: string;
}

function getSettingsValue<T>(settings: Json, key: string, defaultValue: T): T {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return defaultValue;
  const value = (settings as Record<string, unknown>)[key];
  return (value as T) ?? defaultValue;
}

export function NotionSettings({ integration }: NotionSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [databases, setDatabases] = useState<NotionDatabase[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>(
    getSettingsValue(integration?.settings ?? null, "database_id", "")
  );
  const [syncEnabled, setSyncEnabled] = useState(integration?.sync_enabled ?? false);
  const [autoSync, setAutoSync] = useState(
    getSettingsValue(integration?.settings ?? null, "auto_sync", true)
  );
  const [lastSyncAt, setLastSyncAt] = useState(integration?.last_sync_at);

  async function handleSyncNow() {
    if (!selectedDatabase) {
      toast.error("Select a database first");
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch("/api/integrations/notion/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setLastSyncAt(new Date().toISOString());
      toast.success(data.message || `Synced ${data.synced} tasks`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (integration?.sync_enabled) {
      fetchDatabases();
    }
  }, [integration?.sync_enabled]);

  async function fetchDatabases() {
    setIsLoadingDatabases(true);
    try {
      const res = await fetch("/api/integrations/notion/databases");
      const data = await res.json();
      if (data.databases) {
        setDatabases(data.databases);
      }
    } catch {
      toast.error("Failed to load databases");
    } finally {
      setIsLoadingDatabases(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect Notion? Your tasks will no longer sync.")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/integrations/notion/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();

      toast.success("Disconnected from Notion");
      window.location.reload();
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function updateSettings(settings: Record<string, unknown>) {
    try {
      const res = await fetch("/api/integrations/notion/settings", {
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

  async function handleDatabaseSelect(databaseId: string) {
    setSelectedDatabase(databaseId);
    const db = databases.find(d => d.id === databaseId);
    await updateSettings({
      database_id: databaseId,
      database_name: db?.title || "Unknown",
    });
  }

  async function handleSyncToggle(enabled: boolean) {
    setSyncEnabled(enabled);
    try {
      const res = await fetch("/api/integrations/notion/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sync_enabled: enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(enabled ? "Sync enabled" : "Sync disabled");
    } catch {
      toast.error("Failed to update sync");
      setSyncEnabled(!enabled);
    }
  }

  if (!integration || !integration.sync_enabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Notion
          </CardTitle>
          <CardDescription>
            Sync your tasks with a Notion database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/integrations/notion/connect">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 100 100" fill="currentColor">
                <path d="M6.017 4.313l55.333 -4.087c6.797 -0.583 8.543 -0.19 12.817 2.917l17.663 12.443c2.913 2.14 3.883 2.723 3.883 5.053v68.243c0 4.277 -1.553 6.807 -6.99 7.193l-64.307 3.89c-4.087 0.193 -6.027 -0.39 -8.16 -3.303l-12.817 -16.593c-2.333 -3.113 -3.443 -5.443 -3.443 -8.167v-62.157c0 -3.5 1.553 -6.42 6.017 -5.437zm55.137 15.307c0 2.14 -0.387 2.53 -2.527 3.503l-42.137 20.33v45.15c0 1.753 0.973 2.53 2.53 2.53 1.753 0 2.527 -1.167 2.527 -2.53v-41.38l46.803 -22.52c1.557 -0.78 2.337 -1.753 2.337 -3.113v-41.137c0 -1.75 -1.167 -2.723 -2.917 -2.53 -1.557 0.193 -2.337 1.17 -2.337 2.527l-4.28 39.17z"/>
              </svg>
              Connect Notion
            </a>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Two-way sync tasks between bruh. and Notion databases.
          </p>
        </CardContent>
      </Card>
    );
  }

  const workspaceName = getSettingsValue(integration.settings, "workspace_name", "Notion Workspace");
  const databaseName = getSettingsValue(integration.settings, "database_name", "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Notion
          <span className="ml-auto flex items-center gap-1.5 text-sm font-normal text-green-500">
            <Check className="h-4 w-4" />
            Connected
          </span>
        </CardTitle>
        <CardDescription>Connected to {workspaceName}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Database Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sync Database</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDatabases}
              disabled={isLoadingDatabases}
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingDatabases ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Select value={selectedDatabase} onValueChange={handleDatabaseSelect}>
            <SelectTrigger>
              <SelectValue placeholder={isLoadingDatabases ? "Loading..." : "Select a database"} />
            </SelectTrigger>
            <SelectContent>
              {databases.map((db) => (
                <SelectItem key={db.id} value={db.id}>
                  <span className="flex items-center gap-2">
                    <span>{db.icon}</span>
                    <span>{db.title}</span>
                  </span>
                </SelectItem>
              ))}
              {databases.length === 0 && !isLoadingDatabases && (
                <div className="p-2 text-sm text-muted-foreground text-center">
                  No databases found. Share databases with bruh. in Notion.
                </div>
              )}
            </SelectContent>
          </Select>
          {databaseName && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Database className="h-3 w-3" />
              Syncing to: {databaseName}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {lastSyncAt
              ? `Last synced ${new Date(lastSyncAt).toLocaleString()}`
              : "Connected - select a database and sync"}
          </p>
        </div>

        {/* Sync Now Button */}
        {selectedDatabase && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="w-full"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        )}

        {/* Sync Settings */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notion-sync-enabled">Enable Sync</Label>
              <p className="text-xs text-muted-foreground">
                Sync tasks to Notion
              </p>
            </div>
            <Switch
              id="notion-sync-enabled"
              checked={syncEnabled}
              onCheckedChange={handleSyncToggle}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notion-auto-sync">Auto-sync</Label>
              <p className="text-xs text-muted-foreground">
                Sync when tasks change
              </p>
            </div>
            <Switch
              id="notion-auto-sync"
              checked={autoSync}
              onCheckedChange={(checked) => {
                setAutoSync(checked);
                updateSettings({ auto_sync: checked });
              }}
            />
          </div>
        </div>

        {/* Sync Info */}
        {selectedDatabase && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="font-medium text-sm mb-1">How it works</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• New tasks → Create page in Notion</li>
              <li>• Complete task → Mark done in Notion</li>
              <li>• Delete task → Archive in Notion</li>
            </ul>
          </div>
        )}

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
