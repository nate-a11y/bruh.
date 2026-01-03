"use client";

import { useState } from "react";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function IntegrationsSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function generateToken() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/raycast-token");
      const data = await res.json();

      if (data.error) {
        toast.error(data.error);
      } else {
        setToken(data.accessToken);
        toast.success("Token generated!");
      }
    } catch {
      toast.error("Failed to generate token");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToken() {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard!");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raycast Extension</CardTitle>
        <CardDescription>
          Quick capture tasks from anywhere with the Bruh Raycast extension
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a
              href="raycast://extensions/bruh"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Install Extension
            </a>
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Access Token</Label>
          <p className="text-sm text-muted-foreground">
            Generate a token to connect Raycast to your Bruh account
          </p>

          {token ? (
            <div className="flex gap-2">
              <Input value={token} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyToken}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={generateToken}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button onClick={generateToken} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Token"}
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>In Raycast extension preferences, enter:</p>
          <ul className="list-disc list-inside">
            <li>Supabase URL: <code className="bg-muted px-1 rounded">{process.env.NEXT_PUBLIC_SUPABASE_URL || "[Your Supabase URL]"}</code></li>
            <li>Supabase Anon Key: <code className="bg-muted px-1 rounded">[from Supabase dashboard]</code></li>
            <li>Access Token: <code className="bg-muted px-1 rounded">[generated above]</code></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
