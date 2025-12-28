import { useState, useCallback } from "react"
import type { IdentityData } from "@/types/Identity"

export interface FieldConfig {
  key: keyof IdentityData
  label: string
  placeholder: string
  optional?: boolean
  description?: string
  verifiable?: boolean
}

interface UseProgressiveNavigationProps {
  fields: FieldConfig[]
  onComplete: () => void
}

export function useProgressiveNavigation({ fields, onComplete }: UseProgressiveNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [completedFields, setCompletedFields] = useState<Set<number>>(new Set())

  const currentField = fields[currentIndex]
  const isLastField = currentIndex === fields.length - 1

  const handleNext = useCallback(() => {
    setCompletedFields(prev => new Set(prev).add(currentIndex))

    if (isLastField) {
      onComplete()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, isLastField, onComplete])

  const handleSkip = useCallback(() => {
    if (isLastField) {
      onComplete()
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [isLastField, onComplete])

  const goToField = useCallback((index: number) => {
    setCurrentIndex(index)
  }, [])

  return {
    currentIndex,
    currentField,
    isLastField,
    completedFields,
    handleNext,
    handleSkip,
    goToField,
  }
}
