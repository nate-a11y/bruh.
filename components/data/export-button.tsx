"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { exportAllData } from "@/app/(dashboard)/actions";

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (exportFormat: "json" | "csv") => {
    setIsExporting(true);

    try {
      const result = await exportAllData();

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      const { data } = result;
      const timestamp = new Date().toISOString().split("T")[0];

      if (exportFormat === "json") {
        const jsonContent = JSON.stringify(data, null, 2);
        downloadFile(jsonContent, `bruh-export-${timestamp}.json`, "application/json");
        toast.success("Data exported as JSON");
      } else {
        // CSV export - just tasks for simplicity
        const tasks = data.tasks || [];
        if (tasks.length === 0) {
          toast.error("No tasks to export");
          return;
        }

        const headers = [
          "Title",
          "Status",
          "Priority",
          "Due Date",
          "Due Time",
          "Estimated Minutes",
          "Actual Minutes",
          "Notes",
          "Created At",
          "Completed At",
        ];

        const rows = tasks.map((task: Record<string, unknown>) => [
          escapeCsv(String(task.title || "")),
          String(task.status || ""),
          String(task.priority || ""),
          String(task.due_date || ""),
          String(task.due_time || ""),
          String(task.estimated_minutes || ""),
          String(task.actual_minutes || ""),
          escapeCsv(String(task.notes || "")),
          String(task.created_at || ""),
          String(task.completed_at || ""),
        ]);

        const csvContent = [
          headers.join(","),
          ...rows.map((row) => row.join(",")),
        ].join("\n");

        downloadFile(csvContent, `bruh-tasks-${timestamp}.csv`, "text/csv");
        toast.success(`Exported ${tasks.length} tasks as CSV`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
          <span className="text-xs text-muted-foreground ml-2">
            (all data)
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
          <span className="text-xs text-muted-foreground ml-2">
            (tasks only)
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function escapeCsv(str: string): string {
  if (!str) return "";
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
