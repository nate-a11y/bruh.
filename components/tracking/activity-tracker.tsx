"use client";

import { useState, useEffect, useCallback } from "react";
import { format, differenceInMinutes, differenceInSeconds } from "date-fns";
import {
  Play,
  Pause,
  Square,
  Clock,
  Target,
  Coffee,
  Users,
  BookOpen,
  Palette,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const ACTIVITY_TYPES = [
  { value: "focus", label: "Focus Work", icon: Target, color: "text-blue-500" },
  { value: "break", label: "Break", icon: Coffee, color: "text-green-500" },
  { value: "meeting", label: "Meeting", icon: Users, color: "text-purple-500" },
  { value: "admin", label: "Admin", icon: MoreHorizontal, color: "text-slate-500" },
  { value: "learning", label: "Learning", icon: BookOpen, color: "text-amber-500" },
  { value: "creative", label: "Creative", icon: Palette, color: "text-pink-500" },
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number]["value"];

interface ActivitySession {
  id: string;
  activity_type: ActivityType;
  title: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_productive: boolean;
  task_id: string | null;
}

interface Task {
  id: string;
  title: string;
}

interface ActivityTrackerProps {
  tasks?: Task[];
  sessions?: ActivitySession[];
  onStartSession?: (data: {
    activity_type: ActivityType;
    title?: string;
    task_id?: string;
  }) => Promise<{ id: string } | { error: string }>;
  onEndSession?: (sessionId: string, notes?: string) => Promise<void>;
  currentSession?: ActivitySession | null;
}

export function ActivityTracker({
  tasks = [],
  sessions = [],
  onStartSession,
  onEndSession,
  currentSession,
}: ActivityTrackerProps) {
  const [isTracking, setIsTracking] = useState(!!currentSession);
  const [activeSession, setActiveSession] = useState<ActivitySession | null>(
    currentSession || null
  );
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedType, setSelectedType] = useState<ActivityType>("focus");
  const [sessionTitle, setSessionTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [showStartDialog, setShowStartDialog] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (activeSession && !activeSession.ended_at) {
      const updateElapsed = () => {
        const started = new Date(activeSession.started_at);
        const seconds = differenceInSeconds(new Date(), started);
        setElapsedTime(seconds);
      };

      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Sync with currentSession prop
  useEffect(() => {
    if (currentSession) {
      setActiveSession(currentSession);
      setIsTracking(true);
    }
  }, [currentSession]);

  const formatDuration = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  async function handleStart() {
    if (!onStartSession) return;

    const result = await onStartSession({
      activity_type: selectedType,
      title: sessionTitle || undefined,
      task_id: selectedTaskId || undefined,
    });

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setActiveSession({
      id: result.id,
      activity_type: selectedType,
      title: sessionTitle || null,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_minutes: null,
      is_productive: selectedType !== "break",
      task_id: selectedTaskId || null,
    });
    setIsTracking(true);
    setShowStartDialog(false);
    setSessionTitle("");
    setSelectedTaskId("");
    toast.success("Tracking started");
  }

  async function handleStop() {
    if (!activeSession || !onEndSession) return;

    await onEndSession(activeSession.id);
    setActiveSession(null);
    setIsTracking(false);
    setElapsedTime(0);
    toast.success("Session logged");
  }

  const activeType = ACTIVITY_TYPES.find((t) => t.value === activeSession?.activity_type);
  const ActiveIcon = activeType?.icon || Target;

  // Today's stats
  const todayStats = sessions.reduce(
    (acc, session) => {
      if (session.duration_minutes) {
        acc.totalMinutes += session.duration_minutes;
        if (session.is_productive) {
          acc.productiveMinutes += session.duration_minutes;
        }
      }
      return acc;
    },
    { totalMinutes: 0, productiveMinutes: 0 }
  );

  const productivityPercent =
    todayStats.totalMinutes > 0
      ? Math.round((todayStats.productiveMinutes / todayStats.totalMinutes) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activity Tracker
            </CardTitle>
            <CardDescription>Track how you spend your time</CardDescription>
          </div>
          {!isTracking && (
            <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start Activity Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Activity Type</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {ACTIVITY_TYPES.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setSelectedType(type.value)}
                            className={cn(
                              "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                              selectedType === type.value
                                ? "border-primary bg-primary/10"
                                : "hover:bg-muted"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", type.color)} />
                            <span className="text-xs">{type.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-title">Description (optional)</Label>
                    <Input
                      id="session-title"
                      placeholder="What are you working on?"
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                    />
                  </div>

                  {tasks.length > 0 && selectedType === "focus" && (
                    <div className="space-y-2">
                      <Label>Link to Task (optional)</Label>
                      <Select
                        value={selectedTaskId}
                        onValueChange={setSelectedTaskId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a task" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No task</SelectItem>
                          {tasks.map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button onClick={handleStart} className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Tracking
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active session */}
        {isTracking && activeSession && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-full bg-background", activeType?.color)}>
                  <ActiveIcon className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">
                    {activeSession.title || activeType?.label}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Started {format(new Date(activeSession.started_at), "h:mm a")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-2xl font-mono font-bold">
                  {formatDuration(elapsedTime)}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={handleStop}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Today's stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {Math.floor(todayStats.totalMinutes / 60)}h {todayStats.totalMinutes % 60}m
            </div>
            <div className="text-xs text-muted-foreground">Total tracked</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {Math.floor(todayStats.productiveMinutes / 60)}h{" "}
              {todayStats.productiveMinutes % 60}m
            </div>
            <div className="text-xs text-muted-foreground">Productive</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{productivityPercent}%</div>
            <div className="text-xs text-muted-foreground">Productivity</div>
          </div>
        </div>

        <Progress value={productivityPercent} className="h-2" />

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Sessions</div>
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {sessions.slice(0, 5).map((session) => {
                const type = ACTIVITY_TYPES.find(
                  (t) => t.value === session.activity_type
                );
                const Icon = type?.icon || Target;

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", type?.color)} />
                      <span>{session.title || type?.label}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{session.duration_minutes} min</span>
                      <span>•</span>
                      <span>
                        {format(new Date(session.started_at), "h:mm a")}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
