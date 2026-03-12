import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { AlertCircle, CheckCircle } from "lucide-react"

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
  error?: string | null
  isValid?: boolean
}

export function FormField({
  id,
  label,
  icon: _icon,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  description,
  className = "",
  disabled = false,
  error = null,
  isValid = false,
}: FormFieldProps) {
  const hasValue = value && value.trim() !== ""
  const showError = error && hasValue
  const showValid = isValid && hasValue && !error

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-xs uppercase tracking-wide text-gray-500 font-normal flex items-center gap-2">
        {label}
        {!required && <span className="text-gray-600 normal-case">(optional)</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`bg-transparent border-0 border-b rounded-none text-white placeholder:text-gray-600 focus:ring-0 transition-colors px-0 pr-8 ${
            showError
              ? "border-red-500 focus:border-red-400"
              : showValid
                ? "border-green-500 focus:border-green-400"
                : "border-gray-700 focus:border-gray-500"
          }`}
          required={required}
          disabled={disabled}
          aria-invalid={showError ? "true" : undefined}
          aria-describedby={showError ? `${id}-error` : description ? `${id}-desc` : undefined}
        />
        {showError && (
          <AlertCircle className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
        )}
        {showValid && (
          <CheckCircle className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
        )}
      </div>
      {showError && (
        <p id={`${id}-error`} className="text-red-400 text-xs mt-1 flex items-center gap-1">
          {error}
        </p>
      )}
      {description && !showError && (
        <p id={`${id}-desc`} className="text-gray-600 text-xs mt-1">{description}</p>
      )}
    </div>
  )
}
