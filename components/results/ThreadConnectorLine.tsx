"use client";

import { cn } from "@/lib/utils";

interface ThreadConnectorLineProps {
  className?: string;
}

export function ThreadConnectorLine({ className }: ThreadConnectorLineProps) {
  return (
    <div
      className={cn("flex items-center justify-center py-0.5 select-none", className)}
      aria-hidden="true"
    >
      <div className="w-0.5 h-5 bg-border" />
    </div>
  );
}
