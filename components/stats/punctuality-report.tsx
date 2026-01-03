"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

interface PunctualityReportProps {
  accuracyPercentage: number;
  totalEstimated: number;
  totalActual: number;
  taskCount: number;
}

export function PunctualityReport({
  accuracyPercentage,
  totalEstimated,
  totalActual,
  taskCount,
}: PunctualityReportProps) {
  const difference = totalActual - totalEstimated;
  const isOverEstimating = difference < 0;
  const isUnderEstimating = difference > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">
          Estimation Accuracy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {taskCount === 0 ? (
          <p className="text-muted-foreground">
            Complete some tasks with time tracking to see your estimation accuracy.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">
                    Overall Accuracy
                  </span>
                  <span className="text-2xl font-bold">
                    {accuracyPercentage}%
                  </span>
                </div>
                <Progress value={accuracyPercentage} className="h-2" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Estimated</p>
                <p className="text-lg font-semibold">
                  {formatTime(totalEstimated)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Actual</p>
                <p className="text-lg font-semibold">
                  {formatTime(totalActual)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Difference</p>
                <div className="flex items-center gap-2">
                  {isOverEstimating ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : isUnderEstimating ? (
                    <TrendingUp className="h-4 w-4 text-warning" />
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground" />
                  )}
                  <p
                    className={cn(
                      "text-lg font-semibold",
                      isOverEstimating && "text-success",
                      isUnderEstimating && "text-warning"
                    )}
                  >
                    {difference > 0 ? "+" : ""}
                    {formatTime(Math.abs(difference))}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Based on {taskCount} completed task{taskCount !== 1 ? "s" : ""}.{" "}
              {isOverEstimating
                ? "You tend to overestimate. Try reducing your time estimates."
                : isUnderEstimating
                ? "You tend to underestimate. Consider adding buffer time."
                : "Your estimates are spot on!"}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
