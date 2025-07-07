"use client"

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
      <Label htmlFor={id} className="flex items-center text-white">
        {icon}
        {label}
        {!required && <span className="text-gray-500 text-xs ml-2">(optional)</span>}
        {required && <span className="text-red-400 text-xs ml-2">*</span>}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-gray-800/80 border-pink-500/30 text-white placeholder:text-gray-400/60 placeholder:italic placeholder:font-light focus:border-pink-500 transition-colors"
        required={required}
        disabled={disabled}
      />
      {description && <p className="text-gray-500 text-xs">{description}</p>}
    </div>
  )
}
