"use client";

import { motion } from "framer-motion";
import { Coffee, Zap, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/supabase/types";

interface FocusCompleteModalProps {
  open: boolean;
  onClose: () => void;
  onStartBreak: () => void;
  onContinue: () => void;
  task: Task | null;
  sessionsCompleted: number;
  isLongBreak: boolean;
}

const encouragingMessages = [
  "Great work! You crushed it!",
  "Fantastic focus session!",
  "You're on fire!",
  "Keep up the momentum!",
  "Excellent concentration!",
  "You're making great progress!",
  "Another session in the books!",
  "Well done, champion!",
];

export function FocusCompleteModal({
  open,
  onClose,
  onStartBreak,
  onContinue,
  task,
  sessionsCompleted,
  isLongBreak,
}: FocusCompleteModalProps) {
  const message =
    encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="mx-auto mb-4"
          >
            <div className="h-16 w-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </motion.div>
          <DialogTitle className="text-xl">{message}</DialogTitle>
          <DialogDescription className="text-base">
            {task
              ? `You completed a focus session on "${task.title}"`
              : "You completed a focus session"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={onStartBreak} variant="outline" className="h-12">
            <Coffee className="mr-2 h-4 w-4" />
            Take a {isLongBreak ? "Long" : "Short"} Break
          </Button>
          <Button onClick={onContinue} className="h-12">
            <Zap className="mr-2 h-4 w-4" />
            Continue Working
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {sessionsCompleted} focus session{sessionsCompleted !== 1 ? "s" : ""}{" "}
          completed today
        </p>
      </DialogContent>
    </Dialog>
  );
}
