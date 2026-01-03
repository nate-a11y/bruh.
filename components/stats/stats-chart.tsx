"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
  date: string;
  fullDate: string;
  [key: string]: string | number;
}

interface StatsChartProps {
  data: ChartData[];
  title: string;
  dataKey: string;
  color: string;
}

export function StatsChart({ data, title, dataKey, color }: StatsChartProps) {
  const maxValue = Math.max(...data.map((d) => d[dataKey] as number), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] flex items-end justify-between gap-2">
          {data.map((day) => {
            const value = day[dataKey] as number;
            const height = (value / maxValue) * 100;
            const isToday =
              day.fullDate === new Date().toISOString().split("T")[0];

            return (
              <div
                key={day.fullDate}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <div className="relative w-full h-full flex items-end justify-center">
                  <div
                    className="w-full max-w-[40px] rounded-t-md transition-all hover:opacity-80"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      backgroundColor: color,
                      opacity: isToday ? 1 : 0.7,
                    }}
                  />
                  {value > 0 && (
                    <span className="absolute -top-6 text-xs font-medium">
                      {value}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    isToday
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {day.date}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
