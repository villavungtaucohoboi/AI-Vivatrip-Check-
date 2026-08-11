import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className="flex items-center gap-2.5 cursor-pointer select-none text-sm text-ink"
      >
        <input
          type="checkbox"
          id={id}
          ref={ref}
          className={cn(
            "h-5 w-5 shrink-0 rounded-md border border-border text-teal accent-[#0E6B5A]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal",
            className
          )}
          {...props}
        />
        {label}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
