"use client"

import { useEffect, useState } from "react"

interface Dot {
  id: number
  x: number
  y: number
  opacity: number
  scale: number
}

export function WorldPresence() {
  const [dots, setDots] = useState<Dot[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Fade in after a delay
    const fadeTimer = setTimeout(() => setIsVisible(true), 800)

    // Create initial dots - subtle presence
    const initialDots: Dot[] = Array.from({ length: 6 }, (_, i) => ({
      id: i,
      x: 15 + Math.random() * 70,
      y: 30 + Math.random() * 40,
      opacity: 0,
      scale: 0.4 + Math.random() * 0.4,
    }))
    setDots(initialDots)

    // Animate dots with gentle breathing
    const interval = setInterval(() => {
      setDots((prev) =>
        prev.map((dot) => ({
          ...dot,
          opacity: Math.random() > 0.6 ? 0.15 + Math.random() * 0.25 : dot.opacity * 0.85,
          x: dot.x + (Math.random() - 0.5) * 0.8,
          y: dot.y + (Math.random() - 0.5) * 0.8,
        }))
      )
    }, 2500)

    return () => {
      clearTimeout(fadeTimer)
      clearInterval(interval)
    }
  }, [])

  return (
    <div 
      className="pointer-events-none absolute inset-x-0 bottom-0 h-24 overflow-hidden"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: "opacity 2000ms ease",
      }}
    >
      {/* Subtle horizontal line suggesting horizon */}
      <div
        className="absolute left-1/2 top-1/2 h-px w-[50%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.04), transparent)",
        }}
      />

      {/* Soft breathing dots */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full transition-all duration-[2500ms] ease-in-out"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${3 * dot.scale}px`,
            height: `${3 * dot.scale}px`,
            backgroundColor: "rgba(0, 0, 0, 0.12)",
            opacity: dot.opacity,
          }}
        />
      ))}
    </div>
  )
}
