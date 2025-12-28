import { proxy, subscribe } from "valtio"

interface Settings {
  showTransactionModal: boolean
  // Add more settings here as needed
}

const STORAGE_KEY = "whodb_settings"

// Load from localStorage
const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.warn("Failed to load settings from localStorage:", e)
  }
  return defaultSettings
}

const defaultSettings: Settings = {
  showTransactionModal: true,
}

export const settingsStore = proxy<Settings>(loadSettings())

// Persist to localStorage on changes
subscribe(settingsStore, () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsStore))
  } catch (e) {
    console.warn("Failed to save settings to localStorage:", e)
  }
})

// Actions
export const toggleTransactionModal = () => {
  settingsStore.showTransactionModal = !settingsStore.showTransactionModal
}

export const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
  settingsStore[key] = value
}
