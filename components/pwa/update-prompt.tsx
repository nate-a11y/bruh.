"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface UpdatePromptProps {
  onUpdate: () => void;
}

export function UpdatePrompt({ onUpdate }: UpdatePromptProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50"
    >
      <Card className="shadow-lg border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Update available</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                A new version of bruh. is ready
              </p>
            </div>
            <Button size="sm" onClick={onUpdate}>
              Update
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
