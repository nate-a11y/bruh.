"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateDisplayName } from "@/app/(dashboard)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Let's go
    </Button>
  );
}

interface WelcomeModalProps {
  open: boolean;
}

export function WelcomeModal({ open }: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(open);

  async function handleSubmit(formData: FormData) {
    const name = formData.get("name") as string;
    if (!name?.trim()) {
      toast.error("Come on, give us something to work with.");
      return;
    }

    const result = await updateDisplayName(name.trim());
    if (result.error) {
      toast.error(result.error);
    } else {
      setIsOpen(false);
      toast.success(`Welcome, ${name}. Let's get your shit together.`);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            bruh.
          </DialogTitle>
          <DialogDescription className="text-base">
            What should we call you?
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="sr-only">
              Your name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Your name"
              autoFocus
              autoComplete="given-name"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              We'll use this to greet you. No pressure.
            </p>
          </div>
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
