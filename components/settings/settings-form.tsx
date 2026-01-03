"use client";

import { useFormStatus } from "react-dom";
import { useTheme } from "next-themes";
import { Loader2, Moon, Sun, Laptop, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { updatePreferences } from "@/app/(dashboard)/settings/actions";
import { cn } from "@/lib/utils";

interface SettingsFormProps {
  preferences: {
    theme: string;
    default_focus_minutes: number;
    short_break_minutes: number;
    long_break_minutes: number;
    sessions_before_long_break: number;
    sound_enabled: boolean;
    notifications_enabled: boolean;
  };
  userEmail: string;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save Changes
    </Button>
  );
}

export function SettingsForm({ preferences, userEmail }: SettingsFormProps) {
  const { theme, setTheme } = useTheme();

  async function handleSubmit(formData: FormData) {
    // Add current theme to form data
    formData.set("theme", theme || "dark");
    const result = await updatePreferences(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Settings saved");
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userEmail} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how Zeroed looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="flex gap-2">
              {[
                { value: "light", icon: Sun, label: "Light" },
                { value: "dark", icon: Moon, label: "Dark" },
                { value: "system", icon: Laptop, label: "System" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={theme === option.value ? "default" : "outline"}
                  className={cn(
                    "flex-1",
                    theme === option.value && "bg-primary"
                  )}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="mr-2 h-4 w-4" />
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timer Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Timer Settings</CardTitle>
          <CardDescription>Configure your Pomodoro timer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultFocusMinutes">Focus Duration (min)</Label>
              <Input
                id="defaultFocusMinutes"
                name="defaultFocusMinutes"
                type="number"
                min="1"
                max="120"
                defaultValue={preferences.default_focus_minutes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortBreakMinutes">Short Break (min)</Label>
              <Input
                id="shortBreakMinutes"
                name="shortBreakMinutes"
                type="number"
                min="1"
                max="30"
                defaultValue={preferences.short_break_minutes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longBreakMinutes">Long Break (min)</Label>
              <Input
                id="longBreakMinutes"
                name="longBreakMinutes"
                type="number"
                min="1"
                max="60"
                defaultValue={preferences.long_break_minutes}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionsBeforeLongBreak">
                Sessions Before Long Break
              </Label>
              <Input
                id="sessionsBeforeLongBreak"
                name="sessionsBeforeLongBreak"
                type="number"
                min="1"
                max="10"
                defaultValue={preferences.sessions_before_long_break}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Configure audio and notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Sound Effects</p>
              <p className="text-sm text-muted-foreground">
                Play sound when timer completes
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="soundEnabled"
                value="true"
                defaultChecked={preferences.sound_enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Browser Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get notified when timer completes (requires permission)
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                name="notificationsEnabled"
                value="true"
                defaultChecked={preferences.notifications_enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SaveButton />
      </div>
    </form>
  );
}
