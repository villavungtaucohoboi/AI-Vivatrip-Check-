import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[90px] w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
