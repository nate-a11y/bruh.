"use client";

import { useState } from "react";
import { Loader2, CreditCard, Crown, Clock, Gift, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SubscriptionAccess, Subscription } from "@/lib/supabase/types";

interface BillingSettingsProps {
  subscription: Subscription | null;
  access: SubscriptionAccess;
}

export function BillingSettings({ subscription, access }: BillingSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setApplyingCoupon(true);
    try {
      const response = await fetch("/api/subscription/redeem-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setCouponCode("");
        window.location.reload();
      } else {
        toast.error(data.message || "Failed to apply coupon");
      }
    } catch {
      toast.error("Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const getStatusBadge = () => {
    switch (access.status) {
      case "free_forever":
        return <Badge className="bg-gradient-to-r from-purple-500 to-pink-500"><Crown className="h-3 w-3 mr-1" /> Lifetime Access</Badge>;
      case "active":
        return <Badge variant="default"><Crown className="h-3 w-3 mr-1" /> Pro</Badge>;
      case "trialing":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Trial - {access.days_remaining} days left</Badge>;
      case "past_due":
        return <Badge variant="destructive">Payment Past Due</Badge>;
      case "canceled":
      case "trial_expired":
        return <Badge variant="outline">Inactive</Badge>;
      default:
        return null;
    }
  };

  const showUpgradeButton = access.status === "trialing" || access.status === "trial_expired" || access.status === "canceled";
  const showManageButton = access.status === "active" || access.status === "past_due";
  const showCouponInput = access.status !== "free_forever" && access.status !== "active";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
            <CardDescription>Manage your subscription and billing</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="p-4 rounded-lg bg-muted">
          {access.status === "free_forever" && (
            <p className="text-sm">You have lifetime access. No payment required.</p>
          )}
          {access.status === "active" && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Pro subscription active</p>
              {subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
              {subscription?.cancel_at_period_end && (
                <p className="text-sm text-yellow-500">
                  Your subscription will end on {new Date(subscription.current_period_end!).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
          {access.status === "trialing" && (
            <div className="space-y-1">
              <p className="text-sm font-medium">30-day free trial</p>
              <p className="text-sm text-muted-foreground">
                {access.days_remaining} days remaining. Subscribe to continue after your trial.
              </p>
            </div>
          )}
          {access.status === "trial_expired" && (
            <p className="text-sm text-yellow-500">
              Your trial has expired. Subscribe to continue using bruh.
            </p>
          )}
          {access.status === "canceled" && (
            <p className="text-sm text-muted-foreground">
              Your subscription has been canceled. Subscribe to regain access.
            </p>
          )}
          {access.status === "past_due" && (
            <p className="text-sm text-red-500">
              Payment failed. Please update your payment method to continue.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {showUpgradeButton && (
            <Button onClick={handleSubscribe} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Subscribe - $19.99/month
            </Button>
          )}
          {showManageButton && (
            <Button variant="outline" onClick={handleManageBilling} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Billing
            </Button>
          )}
        </div>

        {/* Coupon Code */}
        {showCouponInput && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Have a coupon code?
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="max-w-xs"
              />
              <Button
                variant="secondary"
                onClick={handleApplyCoupon}
                disabled={applyingCoupon || !couponCode.trim()}
              >
                {applyingCoupon && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
