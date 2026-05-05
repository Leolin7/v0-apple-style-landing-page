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

  useEffect(() => {
    // Create initial dots
    const initialDots: Dot[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 20 + Math.random() * 60,
      opacity: 0,
      scale: 0.5 + Math.random() * 0.5,
    }))
    setDots(initialDots)

    // Animate dots appearing and disappearing
    const interval = setInterval(() => {
      setDots((prev) =>
        prev.map((dot) => ({
          ...dot,
          opacity: Math.random() > 0.5 ? Math.random() * 0.4 : dot.opacity * 0.8,
          x: dot.x + (Math.random() - 0.5) * 2,
          y: dot.y + (Math.random() - 0.5) * 2,
        }))
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 overflow-hidden opacity-30">
      {/* Subtle horizontal line suggesting earth/horizon */}
      <div
        className="absolute left-1/2 top-1/2 h-px w-[60%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
        }}
      />

      {/* Glowing dots */}
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="absolute rounded-full transition-all duration-[2000ms] ease-in-out"
          style={{
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: `${4 * dot.scale}px`,
            height: `${4 * dot.scale}px`,
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            opacity: dot.opacity,
            boxShadow: "0 0 8px rgba(255, 255, 255, 0.3)",
          }}
        />
      ))}
    </div>
  )
}
