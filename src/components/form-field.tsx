import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface FormFieldProps {
  id: string
  label: string
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  description?: string
  className?: string
  disabled?: boolean
}

export function FormField({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  description,
  className = "",
  disabled = false,
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-gray-500 font-normal flex items-center gap-2">
        {label}
        {!required && <span className="text-gray-600 normal-case">(optional)</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-0 border-b border-gray-700 rounded-none text-white placeholder:text-gray-600 focus:border-gray-500 focus:ring-0 transition-colors px-0"
        required={required}
        disabled={disabled}
      />
      {description && <p className="text-gray-600 text-xs mt-1">{description}</p>}
    </div>
  )
}
