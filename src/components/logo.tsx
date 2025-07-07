import styles from "./logo.module.css"

interface LogoProps {
  variant?: "default" | "hero"
}

export function Logo({ variant = "default" }: LogoProps) {
  let iconHeightClass = ""
  let textClass = ""
  let marginClass = "mr-2"
  let imgWidth: number
  let imgHeight: number

  if (variant === "hero") {
    // Responsive sizes for homepage/hero display
    iconHeightClass = "h-8 sm:h-10 md:h-12 lg:h-14" // Approx: 32px, 40px, 48px, 56px
    textClass = "text-3xl sm:text-4xl md:text-5xl lg:text-6xl" // Approx: 30px, 36px, 48px, 60px
    marginClass = "mr-2 sm:mr-2 md:mr-3 lg:mr-3"
    imgWidth = 56 // Representative width for the largest icon size
    imgHeight = 56 // Representative height for the largest icon size
  } else {
    // Default sizes for header or other contexts
    iconHeightClass = "h-6" // Approx: 24px
    textClass = "text-xl" // Approx: 20px
    // marginClass remains "mr-2"
    imgWidth = 24
    imgHeight = 24
  }

  return (
    <div className="flex items-center">
      <img
        src="/whodb_icon_compact.svg"
        alt="" // Decorative, as "whodb" text is present
        className={`w-auto ${iconHeightClass} ${marginClass}`}
        width={imgWidth}
        height={imgHeight}
        fetchPriority="high"
      />
      <span className={`${textClass} text-white ${styles.logoText}`}>whodb</span>
    </div>
  )
}
