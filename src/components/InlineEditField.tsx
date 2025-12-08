import { useState, useRef, useEffect } from "react"
import { Check, X, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineEditFieldProps {
  value: string | null | undefined
  placeholder?: string
  label: string
  icon?: React.ReactNode
  editable?: boolean
  onChange?: (value: string) => void
  isVerified?: boolean
  isVerifying?: boolean
  mono?: boolean
  link?: string
  className?: string
}

export function InlineEditField({
  value,
  placeholder,
  label,
  icon,
  editable = false,
  onChange,
  isVerified,
  isVerifying,
  mono = false,
  link,
  className,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    setEditValue(value || "")
  }, [value])

  const handleSave = () => {
    onChange?.(editValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value || "")
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  const displayValue = value || placeholder
  const isEmpty = !value

  if (isEditing && editable) {
    return (
      <div className={cn("group flex items-center gap-3 py-2", className)}>
        {icon && <div className="w-5 h-5 text-gray-400 flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder={placeholder}
              className={cn(
                "flex-1 bg-gray-800 border border-pink-500 rounded px-2 py-1 text-white outline-none",
                mono && "font-mono text-sm"
              )}
            />
            <button
              onClick={handleSave}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-2 rounded transition-colors",
        editable && "hover:bg-gray-800/30 cursor-pointer -mx-2 px-2",
        className
      )}
      onClick={() => editable && setIsEditing(true)}
    >
      {icon && <div className="w-5 h-5 text-gray-400 flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">{label}</div>
        {link && value ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-white hover:text-pink-400 break-all transition-colors",
              mono && "font-mono text-sm"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {displayValue}
          </a>
        ) : (
          <div
            className={cn(
              isEmpty ? "text-gray-600 italic" : "text-white",
              mono && "font-mono text-sm",
              "break-all"
            )}
          >
            {displayValue || "Not set"}
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isVerifying && (
          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
        )}
        {isVerified && !isVerifying && (
          <Check className="w-4 h-4 text-green-400" />
        )}
        {editable && !isEditing && (
          <Pencil className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  )
}
