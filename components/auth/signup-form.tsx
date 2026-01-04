"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2, Gift, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { signup } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending || disabled}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create account
    </Button>
  );
}

export function SignupForm() {
  const [showCoupon, setShowCoupon] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSignup(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!acceptedTerms) {
      toast.error("You must accept the Terms of Service and Privacy Policy");
      return;
    }

    const result = await signup(formData);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <Card className="border-border">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Start your 30-day free trial. No credit card required.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSignup} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* Coupon Code (collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCoupon(!showCoupon)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Gift className="h-4 w-4" />
              Have a coupon code?
              {showCoupon ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showCoupon && (
              <Input
                id="couponCode"
                name="couponCode"
                type="text"
                placeholder="Enter coupon code"
                className="mt-2"
              />
            )}
          </div>

          {/* Terms Acceptance */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptedTerms"
              name="acceptedTerms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-1"
            />
            <label
              htmlFor="acceptedTerms"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-primary hover:underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="text-primary hover:underline"
              >
                Privacy Policy
              </Link>
            </label>
          </div>

          <input
            type="hidden"
            name="acceptedTerms"
            value={acceptedTerms ? "on" : "off"}
          />

          <SubmitButton disabled={!acceptedTerms} />
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-center text-sm text-muted-foreground w-full">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary/80 font-medium"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
