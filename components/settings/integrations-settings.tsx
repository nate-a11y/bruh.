"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function IntegrationsSettings() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

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

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyToken() {
    if (token) {
      copyToClipboard(token, "Token");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Raycast Extension</CardTitle>
        <CardDescription>
          Quick capture tasks from anywhere with the bruh. Raycast extension
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
            Generate a token to connect Raycast to your bruh. account
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

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            In Raycast extension preferences, paste these values:
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">Supabase URL</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(SUPABASE_URL, "URL")}
                disabled={!SUPABASE_URL}
              >
                {copied === "URL" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <span className="text-sm">Supabase Anon Key</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(SUPABASE_ANON_KEY, "Anon Key")}
                disabled={!SUPABASE_ANON_KEY}
              >
                {copied === "Anon Key" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
