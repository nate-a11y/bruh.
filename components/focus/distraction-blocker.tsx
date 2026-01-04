"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  ShieldOff,
  Plus,
  Trash2,
  Globe,
  AlertTriangle,
  Timer,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "social", label: "Social Media", color: "bg-pink-500" },
  { value: "news", label: "News", color: "bg-blue-500" },
  { value: "entertainment", label: "Entertainment", color: "bg-purple-500" },
  { value: "shopping", label: "Shopping", color: "bg-green-500" },
  { value: "other", label: "Other", color: "bg-slate-500" },
];

interface BlockedSite {
  id: string;
  pattern: string;
  name: string;
  category: string;
  is_enabled: boolean;
}

interface DistractionBlockerProps {
  blockedSites: BlockedSite[];
  isBlockingActive: boolean;
  focusTimeRemaining?: number; // seconds
  onToggleBlocking: (enabled: boolean) => void;
  onAddSite: (site: { pattern: string; name: string; category: string }) => Promise<void>;
  onRemoveSite: (siteId: string) => Promise<void>;
  onToggleSite: (siteId: string, enabled: boolean) => Promise<void>;
}

export function DistractionBlocker({
  blockedSites,
  isBlockingActive,
  focusTimeRemaining,
  onToggleBlocking,
  onAddSite,
  onRemoveSite,
  onToggleSite,
}: DistractionBlockerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newSitePattern, setNewSitePattern] = useState("");
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteCategory, setNewSiteCategory] = useState("social");
  const [showBreakDialog, setShowBreakDialog] = useState(false);

  async function handleAddSite() {
    if (!newSitePattern || !newSiteName) {
      toast.error("Please fill in all fields");
      return;
    }

    await onAddSite({
      pattern: newSitePattern,
      name: newSiteName,
      category: newSiteCategory,
    });

    setNewSitePattern("");
    setNewSiteName("");
    setNewSiteCategory("social");
    setShowAddDialog(false);
    toast.success("Site added to block list");
  }

  const enabledCount = blockedSites.filter((s) => s.is_enabled).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {isBlockingActive ? (
                <Shield className="h-5 w-5 text-green-500" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              Distraction Blocker
            </CardTitle>
            <CardDescription>
              {isBlockingActive
                ? `Blocking ${enabledCount} sites during focus sessions`
                : "Enable to block distracting websites during focus"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {focusTimeRemaining !== undefined && focusTimeRemaining > 0 && (
              <Badge variant="outline" className="gap-1">
                <Timer className="h-3 w-3" />
                {Math.floor(focusTimeRemaining / 60)}m left
              </Badge>
            )}
            <Switch
              checked={isBlockingActive}
              onCheckedChange={onToggleBlocking}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active blocking warning */}
        <AnimatePresence>
          {isBlockingActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
            >
              <Shield className="h-5 w-5" />
              <div className="flex-1">
                <div className="font-medium">Focus Shield Active</div>
                <div className="text-sm opacity-80">
                  Distracting sites are being blocked. Stay focused!
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBreakDialog(true)}
                className="text-green-700 dark:text-green-400 hover:bg-green-500/20"
              >
                Take a break
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Blocked sites list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Blocked Sites</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Site
            </Button>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {blockedSites.map((site) => {
              const category = CATEGORIES.find((c) => c.value === site.category);

              return (
                <div
                  key={site.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border",
                    !site.is_enabled && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        category?.color || "bg-slate-500"
                      )}
                    />
                    <div>
                      <div className="font-medium text-sm">{site.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {site.pattern}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={site.is_enabled}
                      onCheckedChange={(checked) =>
                        onToggleSite(site.id, checked)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveSite(site.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {blockedSites.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No sites blocked yet</p>
                <p className="text-xs">Add sites you want to block during focus</p>
              </div>
            )}
          </div>
        </div>

        {/* Add site dialog */}
        <AlertDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Add Blocked Site</AlertDialogTitle>
              <AlertDialogDescription>
                Add a website pattern to block during focus sessions.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Display Name</Label>
                <Input
                  id="site-name"
                  placeholder="e.g., Twitter"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-pattern">Domain Pattern</Label>
                <Input
                  id="site-pattern"
                  placeholder="e.g., twitter.com"
                  value={newSitePattern}
                  onChange={(e) => setNewSitePattern(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use *.example.com to block all subdomains
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="site-category">Category</Label>
                <Select
                  value={newSiteCategory}
                  onValueChange={setNewSiteCategory}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              cat.color
                            )}
                          />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleAddSite}>
                Add Site
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Break confirmation dialog */}
        <AlertDialog open={showBreakDialog} onOpenChange={setShowBreakDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Disable Focus Shield?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to disable the distraction blocker? This
                will allow access to blocked sites. Consider taking a proper
                break instead.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Blocking</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  onToggleBlocking(false);
                  setShowBreakDialog(false);
                }}
              >
                Disable Anyway
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// Blocking overlay that appears when user visits blocked site
export function BlockingOverlay({
  siteName,
  timeRemaining,
  onGoBack,
  onDisableTemporarily,
}: {
  siteName: string;
  timeRemaining?: number;
  onGoBack: () => void;
  onDisableTemporarily?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4"
    >
      <div className="max-w-md text-center space-y-6">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <Shield className="h-20 w-20 mx-auto text-primary" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Focus Mode Active</h1>
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{siteName}</span> is
            blocked during your focus session.
          </p>
        </div>

        {timeRemaining !== undefined && timeRemaining > 0 && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
            <Timer className="h-4 w-4" />
            <span>
              {Math.floor(timeRemaining / 60)}m {timeRemaining % 60}s remaining
            </span>
          </div>
        )}

        <div className="space-y-3">
          <Button onClick={onGoBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back to Work
          </Button>

          {onDisableTemporarily && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisableTemporarily}
              className="text-muted-foreground"
            >
              I really need to access this site
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Stay focused. You've got this! 💪
        </p>
      </div>
    </motion.div>
  );
}
