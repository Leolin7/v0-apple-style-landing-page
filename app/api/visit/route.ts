import { kv } from "@vercel/kv"
import { NextResponse } from "next/server"

const REDIS_KEY = "stayalone:visits:v2"
const INITIAL_COUNT = 1326 // First visitor will see 1,327

export async function GET() {
  try {
    // Check if the key exists
    const currentValue = await kv.get<number>(REDIS_KEY)

    // If key doesn't exist, seed it with initial count
    if (currentValue === null) {
      await kv.set(REDIS_KEY, INITIAL_COUNT)
    }

    // Increment and return the new count
    const count = await kv.incr(REDIS_KEY)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Redis error:", error)
    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 })
  }
}
