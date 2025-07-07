"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface ExpandableFieldProps {
  id: string
  label: string
  icon: React.ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  description?: string
  className?: string
  isExpanded?: boolean
  onToggle?: () => void
}

export function ExpandableField({
  id,
  label,
  icon,
  value,
  onChange,
  placeholder,
  type = "text",
  description,
  className = "",
  isExpanded = false,
  onToggle,
}: ExpandableFieldProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = onToggle ? isExpanded : internalExpanded
  const toggleExpanded = onToggle || (() => setInternalExpanded(!internalExpanded))

  const hasValue = value.trim() !== ""

  return (
    <div className={`border border-gray-700 rounded-lg overflow-hidden transition-all duration-200 ${className}`}>
      <Button
        type="button"
        onClick={toggleExpanded}
        className={`w-full p-4 flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-left transition-colors ${
          hasValue ? "border-l-4 border-l-pink-500" : ""
        }`}
        variant="ghost"
      >
        <div className="flex items-center">
          {icon}
          <span className="text-white font-medium">{label}</span>
          {hasValue && <div className="ml-2 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>}
        </div>
        <div className="flex items-center">
          {hasValue && (
            <span className="text-xs text-pink-400 mr-2 font-mono truncate max-w-32">
              {value.length > 20 ? `${value.substring(0, 20)}...` : value}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </Button>

      {expanded && (
        <div className="p-4 bg-gray-800/50 border-t border-gray-700 space-y-3">
          <Input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-gray-700 border-pink-500/30 text-white placeholder-gray-400 focus:border-pink-500"
          />
          {description && <p className="text-gray-400 text-xs">{description}</p>}
        </div>
      )}
    </div>
  )
}
