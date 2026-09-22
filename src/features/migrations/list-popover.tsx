import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// A count that opens a list; used for imported units with hits and for library usage.
export function ListPopover({
  label,
  title,
  items,
}: {
  label: React.ReactNode
  title: string
  items: { key: string; left: React.ReactNode; right: React.ReactNode }[]
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted underline-offset-4"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 text-sm">
        <p className="mb-2 font-medium">{title}</p>
        <ul className="grid gap-1">
          {items.slice(0, 12).map((item) => (
            <li key={item.key} className="flex justify-between gap-3">
              {item.left}
              {item.right}
            </li>
          ))}
          {items.length > 12 && (
            <li className="text-muted-foreground">
              and {items.length - 12} more
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
