"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Ticket,
  Plus,
  Loader2,
  RefreshCw,
  Infinity as InfinityIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Coupon, CouponType } from "@/lib/supabase/types";

const COUPON_TYPE_LABELS: Record<CouponType, string> = {
  free_forever: "Lifetime free",
  trial_extension: "Trial extension",
  discount: "Discount",
};

function typeBadge(type: CouponType) {
  switch (type) {
    case "free_forever":
      return <Badge className="bg-purple-500 hover:bg-purple-500">Lifetime</Badge>;
    case "trial_extension":
      return <Badge variant="secondary">Trial extension</Badge>;
    case "discount":
      return <Badge variant="default">Discount</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

interface FormState {
  code: string;
  couponType: CouponType;
  discountPercent: string;
  trialDaysExtension: string;
  maxUses: string;
  expiresAt: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  couponType: "free_forever",
  discountPercent: "",
  trialDaysExtension: "",
  maxUses: "",
  expiresAt: "",
  description: "",
};

export function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validateForm(): string | null {
    if (!form.code.trim()) return "Enter a code";
    if (form.couponType === "discount") {
      const pct = Number(form.discountPercent);
      if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
        return "Discount percent must be between 1 and 100";
      }
    }
    if (form.couponType === "trial_extension") {
      const days = Number(form.trialDaysExtension);
      if (!Number.isInteger(days) || days <= 0) {
        return "Trial days must be greater than 0";
      }
    }
    if (form.maxUses.trim()) {
      const uses = Number(form.maxUses);
      if (!Number.isInteger(uses) || uses < 1) {
        return "Max uses must be a positive whole number";
      }
    }
    return null;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          coupon_type: form.couponType,
          description: form.description.trim() || undefined,
          discount_percent:
            form.couponType === "discount" ? Number(form.discountPercent) : undefined,
          trial_days_extension:
            form.couponType === "trial_extension"
              ? Number(form.trialDaysExtension)
              : undefined,
          max_uses: form.maxUses.trim() ? Number(form.maxUses) : undefined,
          expires_at: form.expiresAt || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Coupon ${data.coupon.code} created`);
        setForm(EMPTY_FORM);
        setCoupons((prev) => [data.coupon as Coupon, ...prev]);
      } else {
        toast.error(data.error || "Failed to create coupon");
      }
    } catch {
      toast.error("Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(coupon: Coupon) {
    setTogglingCode(coupon.code);
    try {
      const res = await fetch("/api/admin/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: coupon.code, is_active: !coupon.is_active }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.coupon.is_active
            ? `${coupon.code} activated`
            : `${coupon.code} deactivated`
        );
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? (data.coupon as Coupon) : c))
        );
      } else {
        toast.error(data.error || "Failed to update coupon");
      }
    } catch {
      toast.error("Failed to update coupon");
    } finally {
      setTogglingCode(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Create a promo code
          </CardTitle>
          <CardDescription>
            Generate coupon codes for lifetime access, trial extensions, or discounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="coupon-code">Code</Label>
                <Input
                  id="coupon-code"
                  placeholder="LAUNCH2026"
                  value={form.code}
                  onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                  className="font-mono uppercase"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coupon-type">Type</Label>
                <Select
                  value={form.couponType}
                  onValueChange={(value) =>
                    updateForm("couponType", value as CouponType)
                  }
                >
                  <SelectTrigger id="coupon-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free_forever">Lifetime free</SelectItem>
                    <SelectItem value="trial_extension">Trial extension</SelectItem>
                    <SelectItem value="discount">Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type-specific field */}
            {form.couponType === "discount" && (
              <div className="space-y-2">
                <Label htmlFor="discount-percent">Discount percent</Label>
                <Input
                  id="discount-percent"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="20"
                  value={form.discountPercent}
                  onChange={(e) => updateForm("discountPercent", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Percent off, between 1 and 100
                </p>
              </div>
            )}

            {form.couponType === "trial_extension" && (
              <div className="space-y-2">
                <Label htmlFor="trial-days">Trial days added</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={1}
                  placeholder="30"
                  value={form.trialDaysExtension}
                  onChange={(e) => updateForm("trialDaysExtension", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Extra trial days granted on redemption
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="max-uses">Max uses</Label>
                <Input
                  id="max-uses"
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={(e) => updateForm("maxUses", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for unlimited redemptions
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires-at">Expires</Label>
                <Input
                  id="expires-at"
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => updateForm("expiresAt", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for no expiry
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="coupon-description">Description</Label>
              <Input
                id="coupon-description"
                placeholder="Optional note for your own reference"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create code
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Existing coupons */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                Coupon codes
              </CardTitle>
              <CardDescription>
                {coupons.length} code{coupons.length === 1 ? "" : "s"} total
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCoupons}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No coupon codes yet. Create one above.
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => {
                  const exhausted =
                    coupon.max_uses !== null &&
                    coupon.current_uses >= coupon.max_uses;
                  const expired =
                    coupon.expires_at !== null &&
                    new Date(coupon.expires_at) <= new Date();
                  return (
                    <TableRow key={coupon.id}>
                      <TableCell>
                        <div className="font-mono font-medium">{coupon.code}</div>
                        {coupon.description ? (
                          <div className="text-xs text-muted-foreground">
                            {coupon.description}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>{typeBadge(coupon.coupon_type)}</TableCell>
                      <TableCell className="text-sm">
                        {coupon.coupon_type === "discount"
                          ? `${coupon.discount_percent}% off`
                          : coupon.coupon_type === "trial_extension"
                          ? `+${coupon.trial_days_extension} days`
                          : "Lifetime"}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex items-center gap-1">
                          {coupon.current_uses}
                          {" / "}
                          {coupon.max_uses === null ? (
                            <InfinityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            coupon.max_uses
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {coupon.expires_at
                          ? format(new Date(coupon.expires_at), "MMM d, yyyy")
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        {!coupon.is_active ? (
                          <Badge variant="outline">Inactive</Badge>
                        ) : expired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : exhausted ? (
                          <Badge variant="destructive">Used up</Badge>
                        ) : (
                          <Badge className="bg-emerald-500 hover:bg-emerald-500">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center gap-2">
                          {togglingCode === coupon.code ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : null}
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={() => handleToggle(coupon)}
                            disabled={togglingCode === coupon.code}
                            aria-label={
                              coupon.is_active
                                ? `Deactivate ${coupon.code}`
                                : `Activate ${coupon.code}`
                            }
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
