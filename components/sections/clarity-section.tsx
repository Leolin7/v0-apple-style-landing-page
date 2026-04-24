"use client"

import { useEffect, useState, useRef } from "react"

export function ClaritySection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      {
        threshold: 0.3,
        rootMargin: "-50px",
      }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="flex min-h-screen items-center justify-center bg-white px-6"
    >
      <p
        className={`
          max-w-md text-center text-xl font-light leading-relaxed tracking-wide text-neutral-500
          transition-all duration-1000 ease-out
          sm:text-2xl md:max-w-lg md:text-3xl
          ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}
        `}
      >
        Not loneliness. Just clarity.
      </p>
    </section>
  )
}
