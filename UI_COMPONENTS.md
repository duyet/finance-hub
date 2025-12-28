# Shadcn UI Components - Finance Hub

All Shadcn UI components have been successfully created for the Finance Hub project.

## Created Components

### Utility
- **`app/lib/utils.ts`** - `cn()` function for className merging using clsx and tailwind-merge

### UI Components (in `app/components/ui/`)

1. **button.tsx** (61 lines)
   - Variants: default, destructive, outline, secondary, ghost, link
   - Sizes: default, sm, lg, icon
   - Supports `asChild` for composition with Radix Slot

2. **card.tsx** (78 lines)
   - Components: Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
   - Fully composable card system

3. **input.tsx** (23 lines)
   - Standard form input with proper styling
   - Accessible with focus states

4. **label.tsx** (21 lines)
   - Based on @radix-ui/react-label
   - Proper form labeling support

5. **table.tsx** (111 lines)
   - Components: Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption
   - Fully featured table system for data display

6. **dialog.tsx** (110 lines)
   - Based on @radix-ui/react-dialog
   - Components: Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
   - Includes overlay and portal support

7. **dropdown-menu.tsx** (227 lines)
   - Based on @radix-ui/react-dropdown-menu
   - Full menu system with submenus, checkboxes, radio items
   - Components: DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, and more

8. **select.tsx** (177 lines)
   - Based on @radix-ui/react-select
   - Components: Select, SelectTrigger, SelectContent, SelectItem, SelectLabel, SelectGroup, SelectValue, SelectSeparator
   - Includes scroll buttons for long lists

9. **tabs.tsx** (55 lines)
   - Based on @radix-ui/react-tabs
   - Components: Tabs, TabsList, TabsTrigger, TabsContent
   - Smooth transitions and proper state management

10. **toast.tsx** (143 lines)
    - Based on @radix-ui/react-toast
    - Components: Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction
    - Variants: default, destructive

11. **use-toast.ts** (122 lines)
    - React hook for toast notifications
    - Manages toast state with reducer pattern
    - Exports `useToast` hook and `toast` function

12. **toaster.tsx** (26 lines)
    - Toast container component
    - Renders all active toasts

13. **separator.tsx** (26 lines)
    - Based on @radix-ui/react-separator
    - Horizontal and vertical orientations

## Index File
- **`app/components/ui/index.ts`** - Re-exports all components for easy importing

## Features
- TypeScript with full type safety
- ForwardRef support on all applicable components
- Dark mode support via CSS variables (configured in `app/tailwind.css`)
- Class variance authority (CVA) for variant styling
- Proper accessibility through Radix UI primitives
- Tailwind CSS v4 compatible
- Consistent design system

## Usage Examples

```tsx
// Import individual components
import { Button } from "~/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card"

// Or import from the index
import { Button, Card, Input } from "~/components/ui"
```

## Styling System
All components use the CSS variables defined in `app/tailwind.css`:
- `--background` / `--foreground`
- `--primary` / `--primary-foreground`
- `--secondary` / `--secondary-foreground`
- `--muted` / `--muted-foreground`
- `--accent` / `--accent-foreground`
- `--destructive` / `--destructive-foreground`
- `--border` / `--input` / `--ring`
- `--radius`

Dark mode is supported via the `.dark` class on the root element.
