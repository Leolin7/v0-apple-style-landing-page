import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

// Fresh start - no seeding, no reading from old keys
const REDIS_KEY = "stayalone:visits:fresh-start-001"

export async function GET() {
  try {
    // Simply increment and return - first visit will be 1
    const count = await kv.incr(REDIS_KEY)
    return NextResponse.json({ count })
  } catch (error) {
    console.error("Redis error:", error)
    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 })
  }
}
