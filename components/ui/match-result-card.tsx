import * as React from "react"
import { cn } from "@/lib/utils"

// MatchResultInputModal 전용 카드 컴포넌트
// 기존 Card와 다른 디자인을 적용할 수 있습니다

function MatchResultCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-1 sm:gap-2 rounded-xl border py-1 sm:py-2 shadow-sm",
        // MatchResultInputModal 전용 스타일 추가 가능
        className
      )}
      {...props}
    />
  )
}

function MatchResultCardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-header"
      className={cn(
        "@container/match-result-card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-0.5 px-2 sm:px-3 has-data-[slot=match-result-card-action]:grid-cols-[1fr_auto] [.border-b]:pb-1 sm:[.border-b]:pb-1.5",
        className
      )}
      {...props}
    />
  )
}

function MatchResultCardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function MatchResultCardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function MatchResultCardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function MatchResultCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-content"
      className={cn("px-2 sm:px-3", className)}
      {...props}
    />
  )
}

function MatchResultCardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="match-result-card-footer"
      className={cn("flex items-center px-2 sm:px-3 [.border-t]:pt-1 sm:[.border-t]:pt-1.5", className)}
      {...props}
    />
  )
}

export {
  MatchResultCard,
  MatchResultCardHeader,
  MatchResultCardFooter,
  MatchResultCardTitle,
  MatchResultCardAction,
  MatchResultCardDescription,
  MatchResultCardContent,
}
