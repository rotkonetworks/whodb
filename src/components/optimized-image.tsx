"use client"

import { useState, useEffect } from "react"

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export default function OptimizedImage({ src, alt, width, height, className = "" }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const placeholderSrc = `/placeholder.svg?height=${height}&width=${width}`

  useEffect(() => {
    // Preload the image
    const img = new Image()
    img.src = src
    img.onload = () => setLoaded(true)
  }, [src])

  return (
    <img
      src={loaded ? src : placeholderSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${!loaded ? "animate-pulse bg-gray-700" : ""}`}
      loading="lazy"
    />
  )
}
