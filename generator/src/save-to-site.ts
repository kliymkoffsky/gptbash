#!/usr/bin/env tsx
/**
 * Generate quotes and save to site's quotes.json
 */

import { Mastra } from "@mastra/core";
import { creativeAgents } from "./agents/creative-agents.js";
import { rawShotPrompt } from "./prompts/raw-shot.js";
import { randomUUID } from "crypto";
import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// Path to quotes.json (relative to where we run from)
const QUOTES_PATH = resolve(process.cwd(), "../src/data/quotes.json");

interface Quote {
  uuid: string;
  id: number;
  content: string;
  date: string;
  upvotes: number;
  downvotes: number;
}

interface QuotesData {
  quotes: Quote[];
  meta: {
    totalAccepted: number;
    totalRejected: number;
    lastId: number;
  };
}

function loadQuotes(): QuotesData {
  try {
    const data = readFileSync(QUOTES_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {
      quotes: [],
      meta: { totalAccepted: 0, totalRejected: 0, lastId: 0 },
    };
  }
}

function saveQuotes(data: QuotesData): void {
  data.meta.totalAccepted = data.quotes.length;
  writeFileSync(QUOTES_PATH, JSON.stringify(data, null, 2));
}

function addQuote(content: string): Quote {
  const data = loadQuotes();
  const newQuote: Quote = {
    uuid: randomUUID(),
    id: data.meta.lastId + 1,
    content,
    date: new Date().toISOString(),
    upvotes: 0,
    downvotes: 0,
  };
  data.quotes.push(newQuote);
  data.meta.lastId = newQuote.id;
  saveQuotes(data);
  return newQuote;
}

// Initialize Mastra
const mastra = new Mastra({
  agents: creativeAgents,
});

async function generateQuote(topic: string): Promise<string | null> {
  const agent = mastra.getAgent("conversation-writer");
  
  try {
    const prompt = rawShotPrompt(topic);
    console.log("  Calling API...");
    const result = await agent.generate(prompt);
    const text = result.text || "";
    
    // Try to extract <nick> message lines
    let lines = text.split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes(">") && l.length > 3)
      .map((l) => l.startsWith("<") ? l : "<" + l)
      .slice(0, 7);
    
    // Fallback: parse JSON if that's what we got
    if (lines.length < 2) {
      const jsonMatch = text.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) {
        try {
          let arr = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(arr)) {
            arr = arr.dialogue || arr.messages || arr.conversation || [];
          }
          lines = arr.map((m: any) => {
            const nick = m.speaker || m.author || m.nick || "user";
            const msg = m.message || m.content || m.text || "";
            return `<${nick}> ${msg}`;
          }).slice(0, 7);
        } catch {}
      }
    }
    
    if (lines.length >= 2) {
      console.log("  ✓ Got", lines.length, "lines");
      return lines.join("\n");
    } else {
      console.log("  ✗ Not enough lines. Got:", lines.length);
      console.log("  Raw:", text.substring(0, 200));
    }
  } catch (e: any) {
    console.error("  Error:", e.message || e);
  }
  
  return null;
}

function clearQuotes(): void {
  const empty: QuotesData = { 
    quotes: [],
    meta: { totalAccepted: 0, totalRejected: 0, lastId: 0 },
  };
  saveQuotes(empty);
  console.log("✅ Cleared quotes.json");
}

const SEED_TOPICS = [
  "programming bugs",
  "AI hype",
  "git disasters",
  "production outages",
  "code reviews",
  "stackoverflow",
  "javascript fatigue",
  "linux users",
  "crypto crashes",
  "startup life",
];

async function seedQuotes(count: number): Promise<void> {
  console.log(`\n🌱 Seeding ${count} quotes...\n`);
  
  let added = 0;
  for (let i = 0; i < count; i++) {
    const topic = SEED_TOPICS[i % SEED_TOPICS.length];
    console.log(`[${i + 1}/${count}] "${topic}"`);
    
    const content = await generateQuote(topic);
    if (content) {
      const q = addQuote(content);
      added++;
      console.log(`  → #${q.id}`);
    }
  }
  
  console.log(`\n✅ Added ${added}/${count} quotes`);
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log("📁 Using:", QUOTES_PATH);
  
  if (args.includes("--clear")) {
    clearQuotes();
    return;
  }
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌ Set ANTHROPIC_API_KEY first");
    process.exit(1);
  }
  
  if (args.includes("--seed")) {
    const count = parseInt(args.find((a) => a.startsWith("--count="))?.split("=")[1] || "10", 10);
    await seedQuotes(count);
    return;
  }
  
  const topic = args.find((a) => a.startsWith("--topic="))?.split("=")[1] || "internet drama";
  const count = parseInt(args.find((a) => a.startsWith("--count="))?.split("=")[1] || "1", 10);
  
  console.log(`\n🎭 Generating ${count} for: "${topic}"\n`);
  
  let added = 0;
  for (let i = 0; i < count; i++) {
    console.log(`[${i + 1}/${count}]`);
    const content = await generateQuote(topic);
    if (content) {
      const q = addQuote(content);
      added++;
      console.log(content);
      console.log(`→ Saved as #${q.id}\n`);
    }
  }
  
  console.log(`✅ Added ${added} quotes`);
}

main().catch(console.error);
