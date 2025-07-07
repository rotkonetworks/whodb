import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: [
		"./index.html",
		"./src/**/*.{js,ts,jsx,tsx}",
	],
	safelist: [
		// Safelist our custom button classes to prevent purging
		'btn-primary',
		'btn-secondary',
		'btn-outline',
		'btn-ghost',
		'search-suggestion-item',
		'animation-reduce',
		'line-clamp-2',
		// Network classes
		'network-paseo',
		'network-polkadot',
		'network-kusama',
		// Theme classes
		'day-theme',
		'dark-theme',
	],
	theme: {
		extend: {
			colors: {
				background: "rgb(var(--background-rgb) / <alpha-value>)",
				foreground: "rgb(var(--foreground-rgb) / <alpha-value>)",
				card: "rgb(var(--card-bg) / <alpha-value>)",
				accent: "rgb(var(--accent-color) / <alpha-value>)",
				primary: {
					DEFAULT: "rgb(var(--button-bg) / <alpha-value>)",
					foreground: "rgb(var(--button-text-primary) / <alpha-value>)",
				},
				secondary: {
					DEFAULT: "rgb(var(--button-secondary-bg-rgb) / <alpha-value>)",
					foreground: "rgb(var(--button-text-secondary-rgb) / <alpha-value>)",
				},
				muted: {
					DEFAULT: "rgb(var(--text-secondary) / <alpha-value>)",
					foreground: "rgb(var(--text-primary) / <alpha-value>)",
				},
				border: "rgb(var(--border-color) / <alpha-value>)",
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
			},
		},
	},
	plugins: [],
};

export default config;
