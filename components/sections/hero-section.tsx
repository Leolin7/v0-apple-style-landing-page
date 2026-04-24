"use client"

import { useEffect, useState, useRef } from "react"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white"
    >
      {/* Ultra subtle gradient that follows cursor */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(800px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(0,0,0,0.02), transparent 50%)`,
        }}
      />

      {/* Main text */}
      <h1
        className={`
          cursor-default select-none
          text-5xl font-extralight tracking-[0.2em] text-neutral-800
          transition-all duration-1000 ease-out
          hover:scale-[1.02] hover:text-neutral-600
          sm:text-6xl md:text-7xl lg:text-8xl
          ${isVisible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}
        `}
      >
        Stay Alone
      </h1>

      {/* Scroll indicator */}
      <div
        className={`
          absolute bottom-12 left-1/2 -translate-x-1/2
          transition-all delay-1000 duration-1000 ease-out
          ${isVisible ? "translate-y-0 opacity-40" : "translate-y-4 opacity-0"}
        `}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-px animate-pulse bg-neutral-400" />
        </div>
      </div>
    </section>
  )
}
