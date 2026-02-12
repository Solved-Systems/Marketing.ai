"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ConversationContextValue {
  scrollerRef: React.RefObject<HTMLDivElement | null>
  showScrollButton: boolean
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

const ConversationContext = React.createContext<ConversationContextValue | null>(null)

function useConversationContext() {
  const context = React.useContext(ConversationContext)
  if (!context) {
    throw new Error("Conversation components must be used inside <Conversation />")
  }
  return context
}

export function Conversation({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      setShowScrollButton(distanceFromBottom > 96)
    }

    onScroll()
    el.addEventListener("scroll", onScroll)
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  const value = React.useMemo(
    () => ({ scrollerRef, showScrollButton, scrollToBottom }),
    [showScrollButton, scrollToBottom]
  )

  return (
    <ConversationContext.Provider value={value}>
      <div className={cn("relative flex min-h-0 flex-1 flex-col", className)} {...props}>
        {children}
      </div>
    </ConversationContext.Provider>
  )
}

export function ConversationContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { scrollerRef, scrollToBottom } = useConversationContext()
  const childCount = React.Children.count(children)

  React.useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 140) {
      scrollToBottom("smooth")
    }
  }, [childCount, scrollerRef, scrollToBottom])

  return (
    <div
      ref={scrollerRef}
      className={cn("flex-1 overflow-y-auto px-4 py-4 md:px-5 md:py-5", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface ConversationEmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description: string
  icon?: React.ReactNode
}

export function ConversationEmptyState({
  title,
  description,
  icon,
  className,
  children,
  ...props
}: ConversationEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/30 px-6 py-10 text-center",
        className
      )}
      {...props}
    >
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <h3 className="text-base font-medium text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {children}
    </div>
  )
}

export function ConversationScrollButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { showScrollButton, scrollToBottom } = useConversationContext()
  if (!showScrollButton) return null

  return (
    <Button
      variant="outline"
      size="icon-sm"
      className={cn(
        "absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full bg-background/85 shadow-md backdrop-blur",
        className
      )}
      onClick={() => scrollToBottom("smooth")}
      {...props}
    >
      <ChevronDown className="h-4 w-4" />
    </Button>
  )
}
