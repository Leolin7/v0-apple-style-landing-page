"use client"

import { useEffect, useState, useRef } from "react"

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [isMounted, setIsMounted] = useState(false)
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    
    // Only track mouse on desktop
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0
    if (isTouch) return

    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({
          x: e.clientX / rect.width,
          y: e.clientY / rect.height,
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f7f5]"
      style={{ paddingBottom: "4vh" }}
    >
      {/* Subtle cursor light effect - only on desktop */}
      {isMounted && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out"
          style={{
            background: `radial-gradient(600px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(255,255,255,0.35), transparent 40%)`,
            opacity: 0.8,
          }}
        />
      )}

      {/* Main text with breathing animation */}
      <h1
        className={`
          cursor-default select-none
          text-[2.5rem] font-light tracking-[0.08em] text-[#1d1d1f]
          sm:text-5xl md:text-6xl lg:text-7xl
        `}
        style={{
          fontWeight: 300,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 1200ms cubic-bezier(0.25, 0.1, 0.25, 1), transform 1200ms cubic-bezier(0.25, 0.1, 0.25, 1)",
          animation: isVisible ? "breathe 7s ease-in-out infinite 1.5s" : "none",
        }}
      >
        Stay Alone
      </h1>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.92;
            transform: scale(1.008);
          }
        }
      `}</style>
    </section>
  )
}
