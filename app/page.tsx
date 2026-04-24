import { HeroSection } from "@/components/sections/hero-section"
import { ClaritySection } from "@/components/sections/clarity-section"

export default function HomePage() {
  return (
    <main className="bg-white">
      <HeroSection />
      <ClaritySection />
    </main>
  )
}
