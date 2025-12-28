// Placeholder calendar component
// In production, this would be a full calendar implementation
// For now, TransactionForm uses native HTML date input

import * as React from "react"

interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
}

export const Calendar = React.forwardRef<HTMLDivElement, CalendarProps>(
  ({ mode = "single", selected, onSelect, initialFocus, className }, ref) => {
    // This is a simplified placeholder
    // In a real implementation, this would render a full calendar UI
    React.useEffect(() => {
      if (initialFocus && selected && onSelect) {
        onSelect(selected)
      }
    }, [initialFocus, selected, onSelect])

    return <div ref={ref} className={className} />
  }
)

Calendar.displayName = "Calendar"
