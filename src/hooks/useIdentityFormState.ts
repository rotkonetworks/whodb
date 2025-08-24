import { useState, useCallback, useEffect } from 'react'
import { IdentityData } from '@/types/Identity'

export function useIdentityFormState(initialData?: IdentityData) {
  const [formData, setFormData] = useState<IdentityData>(
    initialData || {
      display: '',
      email: '',
      matrix: '',
      twitter: '',
      web: '',
      github: '',
      pgp_fingerprint: '',
      discord: '',
      image: '',
      legal: '',
    }
  )
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
      setIsDirty(false)
    }
  }, [initialData])

  const updateField = useCallback((field: keyof IdentityData, value: string | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value || '' }))
    setIsDirty(true)
  }, [])

  const updateMultipleFields = useCallback((updates: Partial<IdentityData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setIsDirty(true)
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialData || {
      display: '',
      email: '',
      matrix: '',
      twitter: '',
      web: '',
      github: '',
      pgp_fingerprint: '',
      discord: '',
      image: '',
      legal: '',
    })
    setIsDirty(false)
  }, [initialData])

  const hasRequiredFields = useCallback((requiredFields: (keyof IdentityData)[]) => {
    return requiredFields.every(field => formData[field] && formData[field].trim() !== '')
  }, [formData])

  return {
    formData,
    isDirty,
    updateField,
    updateMultipleFields,
    resetForm,
    hasRequiredFields,
  }
}