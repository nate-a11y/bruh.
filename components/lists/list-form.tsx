"use client";

import { useRef, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createList } from "@/app/(dashboard)/actions";
import { LIST_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface ListFormProps {
  onClose: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Create List
    </Button>
  );
}

export function ListForm({ onClose }: ListFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(formData: FormData) {
    const result = await createList(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("List created");
      onClose();
    }
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="p-4">
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <Input
                ref={inputRef}
                name="name"
                placeholder="List name"
                required
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex flex-wrap gap-2">
              {LIST_COLORS.map((color, index) => (
                <label key={color} className="cursor-pointer">
                  <input
                    type="radio"
                    name="color"
                    value={color}
                    defaultChecked={index === 0}
                    className="sr-only peer"
                  />
                  <div
                    className={cn(
                      "h-6 w-6 rounded-full ring-2 ring-transparent peer-checked:ring-foreground ring-offset-2 ring-offset-background transition-all"
                    )}
                    style={{ backgroundColor: color }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
