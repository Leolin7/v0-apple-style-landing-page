import { Redis } from "@upstash/redis"
import { NextResponse } from "next/server"

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const REDIS_KEY = "stayalone:visits"
const INITIAL_COUNT = 1326 // First visitor will see 1,327

export async function GET() {
  try {
    // Check if the key exists
    const currentValue = await redis.get<number>(REDIS_KEY)

    // If key doesn't exist, seed it with initial count
    if (currentValue === null) {
      await redis.set(REDIS_KEY, INITIAL_COUNT)
    }

    // Increment and return the new count
    const count = await redis.incr(REDIS_KEY)

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Redis error:", error)
    return NextResponse.json({ error: "Failed to update counter" }, { status: 500 })
  }
}
