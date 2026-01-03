"use client";

import { useState } from "react";
import { Plus, FileText, Folder, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { TEMPLATE_CATEGORIES, LIST_COLORS } from "@/lib/constants";

interface CreateTemplateDialogProps {
  onCreateTaskTemplate?: (data: TaskTemplateData) => Promise<void>;
  onCreateProjectTemplate?: (data: ProjectTemplateData) => Promise<void>;
}

interface TaskTemplateData {
  name: string;
  description?: string;
  taskTitle: string;
  taskNotes?: string;
  priority?: string;
  estimatedMinutes?: number;
  subtasks?: string[];
}

interface ProjectTemplateData {
  name: string;
  description?: string;
  category?: string;
  color: string;
  tasks: { title: string; priority?: string }[];
}

export function CreateTemplateDialog({
  onCreateTaskTemplate,
  onCreateProjectTemplate,
}: CreateTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"task" | "project">("task");

  // Task template state
  const [taskName, setTaskName] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskEstimate, setTaskEstimate] = useState("25");
  const [subtaskInput, setSubtaskInput] = useState("");

  // Project template state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectCategory, setProjectCategory] = useState("");
  const [projectColor, setProjectColor] = useState(LIST_COLORS[0]);
  const [projectTasksInput, setProjectTasksInput] = useState("");

  const resetForm = () => {
    setTaskName("");
    setTaskTitle("");
    setTaskNotes("");
    setTaskPriority("normal");
    setTaskEstimate("25");
    setSubtaskInput("");
    setProjectName("");
    setProjectDescription("");
    setProjectCategory("");
    setProjectColor(LIST_COLORS[0]);
    setProjectTasksInput("");
  };

  const handleCreateTaskTemplate = async () => {
    if (!taskName.trim() || !taskTitle.trim()) {
      toast.error("Name and task title are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const subtasks = subtaskInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await onCreateTaskTemplate?.({
        name: taskName.trim(),
        taskTitle: taskTitle.trim(),
        taskNotes: taskNotes.trim() || undefined,
        priority: taskPriority,
        estimatedMinutes: parseInt(taskEstimate) || 25,
        subtasks: subtasks.length > 0 ? subtasks : undefined,
      });

      toast.success("Task template created!");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateProjectTemplate = async () => {
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const tasks = projectTasksInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((title) => ({ title }));

      await onCreateProjectTemplate?.({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
        category: projectCategory || undefined,
        color: projectColor,
        tasks,
      });

      toast.success("Project template created!");
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Failed to create template");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Template</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "task" | "project")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="task">
              <FileText className="h-4 w-4 mr-2" />
              Task
            </TabsTrigger>
            <TabsTrigger value="project">
              <Folder className="h-4 w-4 mr-2" />
              Project
            </TabsTrigger>
          </TabsList>

          <TabsContent value="task" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="task-name">Template Name</Label>
              <Input
                id="task-name"
                placeholder="e.g., Weekly Review"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="e.g., Complete weekly review"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task-estimate">Estimate (min)</Label>
                <Input
                  id="task-estimate"
                  type="number"
                  value={taskEstimate}
                  onChange={(e) => setTaskEstimate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-notes">Notes (optional)</Label>
              <Textarea
                id="task-notes"
                placeholder="Any notes for this task..."
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subtasks">Subtasks (one per line)</Label>
              <Textarea
                id="subtasks"
                placeholder="Review calendar&#10;Check goals&#10;Plan next week"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreateTaskTemplate}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Task Template
            </Button>
          </TabsContent>

          <TabsContent value="project" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Sprint Planning"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-desc">Description (optional)</Label>
              <Textarea
                id="project-desc"
                placeholder="What is this template for?"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={projectCategory} onValueChange={setProjectCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-1 flex-wrap">
                  {LIST_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        projectColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setProjectColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-tasks">Tasks (one per line)</Label>
              <Textarea
                id="project-tasks"
                placeholder="Define goals&#10;Set up project&#10;Create timeline&#10;Review with team"
                value={projectTasksInput}
                onChange={(e) => setProjectTasksInput(e.target.value)}
                rows={4}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleCreateProjectTemplate}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Project Template
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
