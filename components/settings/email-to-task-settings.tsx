"use client";

import { useState, useEffect } from "react";
import { Mail, Copy, Check, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface EmailToTaskSettingsProps {
  emailTaskId: string | null;
  emailTaskEnabled: boolean;
}

export function EmailToTaskSettings({
  emailTaskId: initialEmailTaskId,
  emailTaskEnabled: initialEnabled,
}: EmailToTaskSettingsProps) {
  const [emailTaskId, setEmailTaskId] = useState(initialEmailTaskId);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const emailAddress = emailTaskId
    ? `task+${emailTaskId}@bruh.app`
    : null;

  async function generateEmailId() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/email/generate-address", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate");
      }

      setEmailTaskId(data.emailTaskId);
      toast.success("Email address generated!");
    } catch (error) {
      toast.error("Failed to generate email address");
    } finally {
      setIsGenerating(false);
    }
  }

  async function toggleEnabled(value: boolean) {
    setEnabled(value);
    try {
      const res = await fetch("/api/email/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_task_enabled: value }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success(value ? "Email-to-task enabled" : "Email-to-task disabled");
    } catch {
      setEnabled(!value);
      toast.error("Failed to update settings");
    }
  }

  function copyToClipboard() {
    if (!emailAddress) return;
    navigator.clipboard.writeText(emailAddress);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email to Task
        </CardTitle>
        <CardDescription>
          Forward emails to create tasks automatically. Subject becomes title, body becomes notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="email-enabled">Enable Email-to-Task</Label>
            <p className="text-xs text-muted-foreground">
              Create tasks by forwarding emails
            </p>
          </div>
          <Switch
            id="email-enabled"
            checked={enabled}
            onCheckedChange={toggleEnabled}
            disabled={!emailTaskId}
          />
        </div>

        {/* Email Address */}
        {emailTaskId ? (
          <div className="space-y-2">
            <Label>Your Task Email</Label>
            <div className="flex gap-2">
              <Input
                value={emailAddress || ""}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Forward any email to this address to create a task
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Button onClick={generateEmailId} disabled={isGenerating}>
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Generate Email Address
            </Button>
          </div>
        )}

        {/* Instructions */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex gap-3">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <strong>How it works:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>Forward any email to your task email address</li>
                <li>Email subject becomes the task title</li>
                <li>Email body becomes task notes</li>
                <li>Use natural language: &quot;!high&quot; for priority, dates work too</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Regenerate */}
        {emailTaskId && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={generateEmailId}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Regenerate Address
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              This will invalidate your old email address
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
