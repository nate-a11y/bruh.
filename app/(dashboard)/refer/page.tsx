"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Gift, Copy, Check, Users, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReferralData {
  code: string;
  link: string;
  stats: { total: number; converted: number; rewards: number; rewardCents: number };
}

export default function ReferPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/referral");
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as ReferralData;
        if (active) setData(json);
      } catch {
        if (active) toast.error("Could not load your referral link");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Long-press the link to copy it.");
    }
  }

  const rewardDollars = data ? Math.round(data.stats.rewardCents / 100) : 20;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Gift className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Refer a friend</h1>
          <p className="text-sm text-muted-foreground">
            Give a friend bruh. Pro, get a free month when they subscribe.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your invite link</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : data ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input readOnly value={data.link} className="font-mono text-sm" />
              <Button onClick={copyLink} className="shrink-0 gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load your link.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Invited</p>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data?.stats.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Subscribed</p>
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data?.stats.converted ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Free months</p>
              <Gift className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-bold">{data?.stats.rewards ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Share your link with a friend who could use less chaos.</p>
          <p>2. They sign up and get their own 30-day Pro trial.</p>
          <p>
            3. When they subscribe to Pro, you get a{" "}
            <span className="font-medium text-foreground">${rewardDollars} account credit</span>{" "}
            (one free month) applied to your next bill.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
