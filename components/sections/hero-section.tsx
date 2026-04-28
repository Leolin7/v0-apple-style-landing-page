"use client"

import { useEffect, useState, useRef, useCallback } from "react"

// Formats number with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n.toLocaleString() + (s[(v - 20) % 10] || s[v] || s[0])
}

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 })
  const [isMounted, setIsMounted] = useState(false)
  const [visitorCount, setVisitorCount] = useState<number | null>(null)
  const [loadingState, setLoadingState] = useState<"loading" | "success" | "error">("loading")
  const [isHovered, setIsHovered] = useState(false)
  const containerRef = useRef<HTMLElement>(null)
  const hasCalledApi = useRef(false)

  // Fetch visitor count from API
  const fetchVisitorCount = useCallback(async () => {
    if (hasCalledApi.current) return
    hasCalledApi.current = true

    try {
      const response = await fetch("/api/visit")
      if (!response.ok) throw new Error("Failed to fetch")
      const data = await response.json()
      setVisitorCount(data.count)
      setLoadingState("success")
    } catch {
      setLoadingState("error")
    }
  }, [])

  useEffect(() => {
    setIsMounted(true)
    const timer = setTimeout(() => setIsVisible(true), 50)
    fetchVisitorCount()
    return () => clearTimeout(timer)
  }, [fetchVisitorCount])

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
      {/* Subtle ambient cursor light - extremely soft, large radius */}
      {isMounted && (
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000 ease-out"
          style={{
            background: `radial-gradient(520px circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, rgba(255,255,255,0.25), transparent 50%)`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Content container */}
      <div className="flex flex-col items-center">
        {/* Main text with refined breathing animation */}
        <h1
          className="cursor-default select-none text-[#1d1d1f]"
          style={{
            fontSize: "clamp(2.75rem, 8vw, 5.5rem)",
            fontWeight: 300,
            letterSpacing: "0.2em",
            opacity: isVisible ? (isHovered ? 1 : 0.96) : 0,
            transform: isVisible 
              ? `translateY(0) scale(${isHovered ? 1.003 : 1})` 
              : "translateY(10px) scale(1)",
            transition: "opacity 1400ms cubic-bezier(0.22, 1, 0.36, 1), transform 1400ms cubic-bezier(0.22, 1, 0.36, 1)",
            animation: isVisible ? "breathe 9s ease-in-out infinite 1.8s" : "none",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          Stay Alone
        </h1>

        {/* Visitor counter - quiet whisper */}
        <p
          className="cursor-default select-none text-[#8e8e93]"
          style={{
            marginTop: "clamp(1.75rem, 4vw, 2.5rem)",
            fontSize: "clamp(0.75rem, 1.5vw, 0.875rem)",
            fontWeight: 300,
            letterSpacing: "0.1em",
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 1000ms cubic-bezier(0.22, 1, 0.36, 1) 450ms, transform 1000ms cubic-bezier(0.22, 1, 0.36, 1) 450ms",
          }}
        >
          {loadingState === "loading" && "Finding your place in the stillness..."}
          {loadingState === "error" && "Choosing stillness."}
          {loadingState === "success" && visitorCount !== null && (
            <>You are the <span style={{ fontWeight: 500, color: "#6e6e73" }}>{getOrdinalSuffix(visitorCount)}</span> soul choosing to stay alone.</>
          )}
        </p>
      </div>

      <style jsx>{`
        @keyframes breathe {
          0%, 100% {
            opacity: 0.96;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.006);
          }
        }
      `}</style>
    </section>
  )
}
