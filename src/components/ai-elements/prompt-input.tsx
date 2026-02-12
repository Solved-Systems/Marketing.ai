"use client"

import * as React from "react"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PromptInputStatus = "submitted" | "streaming" | "ready" | "error"

interface PromptInputProps extends React.FormHTMLAttributes<HTMLFormElement> {
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function PromptInput({ className, onSubmit, children, ...props }: PromptInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className={cn(
        "rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-sm backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </form>
  )
}

export function PromptInputBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full", className)} {...props} />
}

export function PromptInputFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2", className)}
      {...props}
    />
  )
}

export function PromptInputTools({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-1.5", className)} {...props} />
}

interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number
  maxHeight?: number
}

export function PromptInputTextarea({
  className,
  minHeight = 64,
  maxHeight = 180,
  onInput,
  ...props
}: PromptInputTextareaProps) {
  const handleInput = (event: React.InputEvent<HTMLTextAreaElement>) => {
    const target = event.currentTarget
    target.style.height = "auto"
    const nextHeight = Math.min(Math.max(target.scrollHeight, minHeight), maxHeight)
    target.style.height = `${nextHeight}px`

    if (onInput) {
      onInput(event)
    }
  }

  return (
    <textarea
      rows={1}
      className={cn(
        "w-full resize-none rounded-md bg-transparent px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none",
        className
      )}
      onInput={handleInput}
      {...props}
    />
  )
}

interface PromptInputSubmitProps extends React.ComponentProps<typeof Button> {
  status?: PromptInputStatus
}

export function PromptInputSubmit({
  status = "ready",
  className,
  disabled,
  ...props
}: PromptInputSubmitProps) {
  const isBusy = status === "submitted" || status === "streaming"

  return (
    <Button
      type="submit"
      size="icon-sm"
      className={cn("h-9 w-9 rounded-md", className)}
      disabled={disabled || isBusy}
      {...props}
    >
      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
    </Button>
  )
}
