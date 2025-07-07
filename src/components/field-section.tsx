"use client"

import type React from "react"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface FieldSectionProps {
  title: string
  description: string
  icon: React.ReactNode
  children: React.ReactNode
  filledCount: number
  totalCount: number
  defaultExpanded?: boolean
}

export function FieldSection({
  title,
  description,
  icon,
  children,
  filledCount,
  totalCount,
  defaultExpanded = false,
}: FieldSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <Button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-left"
        variant="ghost"
      >
        <div className="flex items-center">
          {icon}
          <div>
            <h3 className="text-white font-medium">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {filledCount > 0 && (
            <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">
              {filledCount}/{totalCount}
            </Badge>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </Button>

      {isExpanded && <div className="p-4 bg-gray-800/30 border-t border-gray-700 space-y-3">{children}</div>}
    </div>
  )
}
