#!/usr/bin/env node
/**
 * Auto-translate messages/es.json → messages/en.json using OpenRouter.
 *
 * Usage: node scripts/translate.mjs
 *
 * Requires OPENROUTER_API_KEY in .env
 */

import { readFileSync, writeFileSync } from "fs";
import { config } from "dotenv";

config();

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) {
  console.error("OPENROUTER_API_KEY not set");
  process.exit(1);
}

const esJson = readFileSync("messages/es.json", "utf-8");

async function translate() {
  console.log("Translating es.json → en.json via OpenRouter...");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following JSON from Spanish to English.
Rules:
- Keep ALL JSON keys exactly as they are (do not translate keys)
- Only translate the string values
- Maintain the brand name "Three Billion Heartbeats" for "Tres Mil Millones de Latidos"
- Keep the tone: direct, empowering, action-oriented
- Output valid JSON only, no markdown, no explanation`,
        },
        { role: "user", content: esJson },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    console.error("OpenRouter error:", res.status, await res.text());
    process.exit(1);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("No content in response");
    process.exit(1);
  }

  // Extract JSON from potential markdown wrapping
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not extract JSON from response");
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    writeFileSync("messages/en.json", JSON.stringify(parsed, null, 2) + "\n");
    console.log("✓ messages/en.json updated successfully");
  } catch (e) {
    console.error("Invalid JSON in response:", e.message);
    writeFileSync("messages/en.json.draft", content);
    console.log("Draft saved to messages/en.json.draft for manual review");
    process.exit(1);
  }
}

translate();
