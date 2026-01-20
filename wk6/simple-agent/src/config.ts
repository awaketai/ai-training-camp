/**
 * Configuration loader - loads environment variables from .env file
 */

import { config } from "dotenv"
import { resolve } from "path"

let loaded = false

/**
 * Load environment variables from .env file
 * Call this at the start of your application
 */
export function loadEnv(path?: string): void {
  if (loaded) return

  config({
    path: path ?? resolve(process.cwd(), ".env")
  })

  loaded = true
}

/**
 * Get configuration from environment variables
 */
export function getConfig() {
  return {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
      model: process.env.OPENAI_MODEL ?? "gpt-4o"
    }
  }
}

// Auto-load .env when this module is imported
loadEnv()
