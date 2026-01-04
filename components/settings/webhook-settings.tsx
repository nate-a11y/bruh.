"use client";

import { useState, useEffect } from "react";
import {
  Key,
  Webhook,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  ExternalLink,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface OutgoingWebhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

const WEBHOOK_EVENTS = {
  "task.created": { label: "Task Created", description: "When a new task is created" },
  "task.updated": { label: "Task Updated", description: "When a task is modified" },
  "task.completed": { label: "Task Completed", description: "When a task is marked complete" },
  "task.deleted": { label: "Task Deleted", description: "When a task is deleted" },
  "focus.started": { label: "Focus Started", description: "When a focus session begins" },
  "focus.completed": { label: "Focus Completed", description: "When a focus session ends" },
};

export function WebhookSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<OutgoingWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch("/api/webhooks/keys"),
        fetch("/api/webhooks/outgoing"),
      ]);

      if (keysRes.ok) {
        const { keys } = await keysRes.json();
        setApiKeys(keys);
      }
      if (webhooksRes.ok) {
        const { webhooks: wh } = await webhooksRes.json();
        setWebhooks(wh);
      }
    } catch (error) {
      console.error("Failed to fetch webhook data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Keys
          </CardTitle>
          <CardDescription>
            Generate API keys to receive webhooks from Zapier, Make, n8n, or custom integrations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newKeySecret && (
            <div className="p-4 rounded-lg border border-yellow-500 bg-yellow-500/10">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Save this API key now - you won't see it again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {newKeySecret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newKeySecret, "new-key")}
                >
                  {copiedKey === "new-key" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewKeySecret(null)}
              >
                I've saved it
              </Button>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{key.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {key.key_prefix}...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {key.last_used_at
                        ? `Last used ${formatDistanceToNow(new Date(key.last_used_at))} ago`
                        : "Never used"}
                      {key.expires_at && (
                        <> · Expires {formatDistanceToNow(new Date(key.expires_at))}</>
                      )}
                    </p>
                  </div>
                  <DeleteApiKeyButton
                    keyId={key.id}
                    keyName={key.name}
                    onDelete={fetchData}
                  />
                </div>
              ))}
            </div>
          )}

          <CreateApiKeyDialog
            onCreated={(secret) => {
              setNewKeySecret(secret);
              fetchData();
            }}
          />
        </CardContent>
      </Card>

      {/* Outgoing Webhooks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Outgoing Webhooks
          </CardTitle>
          <CardDescription>
            Send events to external services when things happen in bruh.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {newWebhookSecret && (
            <div className="p-4 rounded-lg border border-yellow-500 bg-yellow-500/10">
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
                Save this signing secret now - you won't see it again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                  {newWebhookSecret}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newWebhookSecret, "new-webhook")}
                >
                  {copiedKey === "new-webhook" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setNewWebhookSecret(null)}
              >
                I've saved it
              </Button>
            </div>
          )}

          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outgoing webhooks yet.</p>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <WebhookItem
                  key={webhook.id}
                  webhook={webhook}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}

          <CreateWebhookDialog
            onCreated={(secret) => {
              setNewWebhookSecret(secret);
              fetchData();
            }}
          />
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            Learn how to integrate bruh. with your tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Incoming Webhook URL</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                  POST /api/webhooks/incoming
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(
                      `${window.location.origin}/api/webhooks/incoming`,
                      "url"
                    )
                  }
                >
                  {copiedKey === "url" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Example: Create Task</h4>
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/incoming \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "create_task",
    "data": {
      "title": "Review proposal",
      "due_date": "2024-01-15",
      "priority": "high"
    }
  }'`}
              </pre>
            </div>

            <Button variant="outline" asChild>
              <a
                href="/api/webhooks/incoming"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Full API Docs
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-components

function CreateApiKeyDialog({ onCreated }: { onCreated: (secret: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/webhooks/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          expires_in_days: expiresIn === "never" ? null : parseInt(expiresIn),
        }),
      });

      if (res.ok) {
        const { key } = await res.json();
        toast.success("API key created");
        setOpen(false);
        setName("");
        onCreated(key.secret);
      } else {
        toast.error("Failed to create API key");
      }
    } catch {
      toast.error("Failed to create API key");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for incoming webhooks
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g., Zapier Integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expires">Expires</Label>
            <Select value={expiresIn} onValueChange={setExpiresIn}>
              <SelectTrigger>
                <SelectValue placeholder="Select expiration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || creating}>
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteApiKeyButton({
  keyId,
  keyName,
  onDelete,
}: {
  keyId: string;
  keyName: string;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete API key "${keyName}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/webhooks/keys?id=${keyId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("API key deleted");
        onDelete();
      } else {
        toast.error("Failed to delete API key");
      }
    } catch {
      toast.error("Failed to delete API key");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4 text-destructive" />
      )}
    </Button>
  );
}

function CreateWebhookDialog({ onCreated }: { onCreated: (secret: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  }

  async function handleCreate() {
    if (!name.trim() || !url.trim() || events.length === 0) return;

    setCreating(true);
    try {
      const res = await fetch("/api/webhooks/outgoing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim(), events }),
      });

      if (res.ok) {
        const { webhook } = await res.json();
        toast.success("Webhook created");
        setOpen(false);
        setName("");
        setUrl("");
        setEvents([]);
        onCreated(webhook.secret);
      } else {
        const { error } = await res.json();
        toast.error(error || "Failed to create webhook");
      }
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Webhook
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Outgoing Webhook</DialogTitle>
          <DialogDescription>
            Send events to an external URL when things happen in bruh.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="webhook-name">Name</Label>
            <Input
              id="webhook-name"
              placeholder="e.g., Slack Notifications"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              type="url"
              placeholder="https://hooks.zapier.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Events</Label>
            <div className="grid gap-2">
              {Object.entries(WEBHOOK_EVENTS).map(([key, { label }]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={events.includes(key)}
                    onCheckedChange={() => toggleEvent(key)}
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !url.trim() || events.length === 0 || creating}
          >
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhookItem({
  webhook,
  onUpdate,
}: {
  webhook: OutgoingWebhook;
  onUpdate: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleTest() {
    setTesting(true);
    try {
      const res = await fetch("/api/webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_id: webhook.id }),
      });

      const result = await res.json();
      if (result.success) {
        toast.success("Test webhook sent successfully");
      } else {
        toast.error(result.message || "Test webhook failed");
      }
    } catch {
      toast.error("Failed to send test webhook");
    } finally {
      setTesting(false);
    }
  }

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await fetch("/api/webhooks/outgoing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: webhook.id, is_active: enabled }),
      });

      if (res.ok) {
        toast.success(enabled ? "Webhook enabled" : "Webhook disabled");
        onUpdate();
      } else {
        toast.error("Failed to update webhook");
      }
    } catch {
      toast.error("Failed to update webhook");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete webhook "${webhook.name}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/webhooks/outgoing?id=${webhook.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Webhook deleted");
        onUpdate();
      } else {
        toast.error("Failed to delete webhook");
      }
    } catch {
      toast.error("Failed to delete webhook");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="p-4 rounded-lg border space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{webhook.name}</p>
            {!webhook.is_active && (
              <Badge variant="secondary">Disabled</Badge>
            )}
            {webhook.failure_count > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {webhook.failure_count} failures
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
            {webhook.url}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={webhook.is_active}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {webhook.events.map((event) => (
          <Badge key={event} variant="outline" className="text-xs">
            {WEBHOOK_EVENTS[event as keyof typeof WEBHOOK_EVENTS]?.label || event}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {webhook.last_triggered_at
            ? `Last triggered ${formatDistanceToNow(new Date(webhook.last_triggered_at))} ago`
            : "Never triggered"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={testing || !webhook.is_active}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            <span className="ml-1">Test</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-destructive" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
