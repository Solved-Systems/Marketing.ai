"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type MessageFrom = "user" | "assistant" | "system"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  from: MessageFrom
}

export function Message({ from, className, ...props }: MessageProps) {
  return (
    <div
      data-from={from}
      className={cn(
        "group/message flex w-full",
        from === "user" ? "justify-end" : "justify-start",
        className
      )}
      {...props}
    />
  )
}

export function MessageContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full max-w-[92%] rounded-xl border px-3.5 py-2.5 text-sm sm:max-w-[88%]",
        "group-data-[from=user]/message:border-primary/30 group-data-[from=user]/message:bg-primary/15",
        "group-data-[from=assistant]/message:border-border/60 group-data-[from=assistant]/message:bg-muted/35",
        "group-data-[from=system]/message:border-amber-500/30 group-data-[from=system]/message:bg-amber-500/10",
        className
      )}
      {...props}
    />
  )
}

export function MessageResponse({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("whitespace-pre-wrap leading-relaxed", className)} {...props}>
      {children}
    </div>
  )
}
