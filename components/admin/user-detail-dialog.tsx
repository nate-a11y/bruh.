"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Loader2,
  Mail,
  CreditCard,
  Activity,
  Users,
  UserCheck,
  ShieldOff,
  Hash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  user: {
    id: string;
    email: string | null;
    createdAt: string | null;
    lastSignIn: string | null;
    suspended: boolean;
  };
  subscription: {
    status: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    stripeCustomerId: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  preferences: {
    displayName: string | null;
    referralCode: string | null;
  };
  activity: {
    taskCount: number;
    lastTaskAt: string | null;
  };
  referrals: {
    invited: number;
    converted: number;
    wasReferredBy: string | null;
  };
  recentEmails: Array<{
    type: string | null;
    subject: string | null;
    createdAt: string;
  }>;
}

interface UserDetailDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Never";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Unknown";
  return format(d, withTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy");
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "warning" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "default";
    case "past_due":
      return "warning";
    case "canceled":
    case "trial_expired":
      return "destructive";
    default:
      return "secondary";
  }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function UserDetailDialog({
  userId,
  open,
  onOpenChange,
}: UserDetailDialogProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !userId) return;

    let active = true;
    setLoading(true);
    setError(false);
    setProfile(null);

    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as UserProfile;
        if (active) setProfile(data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {profile?.preferences.displayName ||
              profile?.user.email ||
              "User detail"}
            {profile?.user.suspended && (
              <Badge variant="destructive" className="gap-1">
                <ShieldOff className="h-3 w-3" />
                Suspended
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {profile?.user.email || "Full profile for this account"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading user profile...
          </div>
        )}

        {!loading && (error || !profile) && (
          <div className="py-8 text-sm text-muted-foreground">
            Could not load this user.
          </div>
        )}

        {!loading && profile && (
          <div className="space-y-4">
            {/* Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Email" value={profile.user.email || "Unknown"} />
                <InfoRow
                  label="Display name"
                  value={profile.preferences.displayName || "Not set"}
                />
                <InfoRow
                  label="Joined"
                  value={formatDate(profile.user.createdAt)}
                />
                <InfoRow
                  label="Last sign in"
                  value={formatDate(profile.user.lastSignIn, true)}
                />
                <InfoRow
                  label="Status"
                  value={
                    profile.user.suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )
                  }
                />
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.subscription ? (
                  <>
                    <InfoRow
                      label="Status"
                      value={
                        <Badge
                          variant={statusVariant(profile.subscription.status)}
                        >
                          {profile.subscription.status}
                        </Badge>
                      }
                    />
                    <InfoRow
                      label="Trial ends"
                      value={formatDate(profile.subscription.trialEndsAt)}
                    />
                    <InfoRow
                      label="Current period ends"
                      value={formatDate(profile.subscription.currentPeriodEnd)}
                    />
                    <InfoRow
                      label="Cancels at period end"
                      value={
                        profile.subscription.cancelAtPeriodEnd ? "Yes" : "No"
                      }
                    />
                    <InfoRow
                      label="Stripe customer"
                      value={
                        profile.subscription.stripeCustomerId ? (
                          <span className="font-mono text-xs">
                            {profile.subscription.stripeCustomerId}
                          </span>
                        ) : (
                          "None"
                        )
                      }
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No subscription record.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Activity + Referrals */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow
                    label="Tasks created"
                    value={profile.activity.taskCount}
                  />
                  <InfoRow
                    label="Last task"
                    value={formatDate(profile.activity.lastTaskAt)}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4 text-primary" />
                    Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <InfoRow
                    label="Invited"
                    value={profile.referrals.invited}
                  />
                  <InfoRow
                    label="Converted"
                    value={profile.referrals.converted}
                  />
                  <InfoRow
                    label="Referred by"
                    value={profile.referrals.wasReferredBy || "No one"}
                  />
                  {profile.preferences.referralCode && (
                    <InfoRow
                      label="Referral code"
                      value={
                        <span className="flex items-center justify-end gap-1 font-mono text-xs">
                          <Hash className="h-3 w-3" />
                          {profile.preferences.referralCode}
                        </span>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent emails */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="h-4 w-4 text-primary" />
                  Recent emails ({profile.recentEmails.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.recentEmails.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No emails sent to this user yet.
                  </p>
                ) : (
                  profile.recentEmails.map((email, i) => (
                    <div
                      key={`${email.createdAt}-${i}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {email.type || "email"}
                        </Badge>
                        <span className="truncate">
                          {email.subject || "No subject"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(email.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
