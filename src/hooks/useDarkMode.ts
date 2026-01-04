import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    const handleDarkModeChange = (event: MediaQueryListEvent): void => {
      setDark(event.matches);
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleDarkModeChange);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleDarkModeChange);
    }
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])
  const setDark = (value: boolean) => {
    setIsDark(value)
  }

  return { isDark, setDark }
}
