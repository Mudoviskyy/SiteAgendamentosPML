
import React from "react"
import { cn } from "@/lib/utils"

const Checkbox = React.forwardRef(({ className, checked, onChange, disabled, ...props }, ref) => {
  return (
    <input
      type="checkbox"
      ref={ref}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 text-[#2D5016] accent-[#2D5016] ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D5016] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
        className
      )}
      {...props}
    />
  )
})
Checkbox.displayName = "Checkbox"

export { Checkbox }
export default Checkbox
