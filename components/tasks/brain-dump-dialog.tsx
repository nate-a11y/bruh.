"use client";

import { useState, useEffect } from "react";
import { Brain, Loader2, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { processBrainDump } from "@/app/(dashboard)/actions";
import { useRouter } from "next/navigation";
import type { List } from "@/lib/supabase/types";

interface BrainDumpDialogProps {
  lists: List[];
  defaultListId?: string;
  trigger?: React.ReactNode;
  // Controlled mode
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const PLACEHOLDER_TEXT = `Dump everything here. We'll sort it out.

Example:
- Need to call mom about Sunday dinner
- URGENT: Finish quarterly report by Friday
- Buy groceries - milk, eggs, bread (30 min)
- Research vacation spots for July, maybe look at flights
- Schedule dentist appointment
- Review pull request from Alex
- Eventually update my resume
- Ideas for the team meeting next week:
  - Discuss new project timeline
  - Review Q1 metrics
  - Team bonding activity`;

export function BrainDumpDialog({
  lists,
  defaultListId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BrainDumpDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Support both controlled and uncontrolled modes
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange || (() => {})) : setInternalOpen;
  const [text, setText] = useState("");
  const [listId, setListId] = useState(defaultListId || lists[0]?.id || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    tasksCreated: number;
    tasks: { id: string; title: string }[];
  } | null>(null);

  async function handleProcess() {
    if (!text.trim() || !listId) {
      toast.error("Need something to dump.");
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await processBrainDump(text, listId);

      if (response.error) {
        toast.error(response.error);
      } else if (response.success) {
        setResult({
          tasksCreated: response.tasksCreated || 0,
          tasks: response.tasks || [],
        });
        toast.success(`${response.tasksCreated} task${response.tasksCreated !== 1 ? "s" : ""} extracted. Nice.`);
      }
    } catch (error) {
      toast.error("Something broke. Try again.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset after animation
    setTimeout(() => {
      setText("");
      setResult(null);
    }, 200);
  }

  function handleDone() {
    handleClose();
  }

  // In controlled mode (when open/onOpenChange are passed), don't render a trigger
  // The dialog is controlled externally (e.g., via keyboard shortcut or command menu)
  const showTrigger = !isControlled || trigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" className="gap-2">
              <Brain className="h-4 w-4" />
              Brain Dump
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Brain Dump
          </DialogTitle>
          <DialogDescription>
            Paste your chaos. AI will turn it into tasks.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 flex-1 overflow-hidden flex flex-col"
            >
              {/* List selector */}
              <div className="space-y-2">
                <Label>Add tasks to</Label>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: list.color }}
                          />
                          {list.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Text input */}
              <div className="flex-1 min-h-0">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={PLACEHOLDER_TEXT}
                  className="h-full min-h-[300px] resize-none font-mono text-sm"
                  disabled={isProcessing}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  {text.trim() ? `${text.split("\n").filter(l => l.trim()).length} lines` : "Waiting for chaos..."}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={isProcessing}>
                    Cancel
                  </Button>
                  <Button onClick={handleProcess} disabled={isProcessing || !text.trim()}>
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Parse It
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Success state */}
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"
                >
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </motion.div>
                <h3 className="text-xl font-bold mb-1">
                  {result.tasksCreated} task{result.tasksCreated !== 1 ? "s" : ""} extracted
                </h3>
                <p className="text-muted-foreground text-sm">
                  Chaos → Order. You&apos;re welcome.
                </p>
              </div>

              {/* Task list preview */}
              <div className="max-h-[180px] overflow-auto rounded-lg border bg-muted/30">
                <ul className="divide-y divide-border">
                  {result.tasks.map((task, i) => (
                    <motion.li
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-2.5 flex items-center gap-3"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      <span className="text-sm truncate">{task.title}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setResult(null);
                    setText("");
                  }}
                >
                  <Brain className="h-4 w-4 mr-2" />
                  Dump More
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleClose();
                    router.push("/today");
                  }}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
