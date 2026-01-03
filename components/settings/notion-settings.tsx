"use client";

import { useState } from "react";
import { Check, Loader2, Unlink, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Json } from "@/lib/supabase/types";

interface NotionSettingsProps {
  integration: {
    id: string;
    settings: Json;
    sync_enabled: boolean;
  } | null;
}

// Helper to safely access settings from Json type
function getSettingsValue<T>(settings: Json, key: string, defaultValue: T): T {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return defaultValue;
  const value = (settings as Record<string, unknown>)[key];
  return (value as T) ?? defaultValue;
}

export function NotionSettings({ integration }: NotionSettingsProps) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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

  if (!integration || !integration.sync_enabled) {
    // Not connected state
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
            Two-way sync tasks between Bruh and Notion databases.
          </p>
        </CardContent>
      </Card>
    );
  }

  const workspaceName = getSettingsValue(integration.settings, "workspace_name", "Notion Workspace");

  // Connected state
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
        {/* Info */}
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium text-sm mb-2">Sync Status</p>
          <p className="text-xs text-muted-foreground">
            Tasks will sync to your selected Notion database. Database selection coming soon.
          </p>
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
