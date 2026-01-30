import { z } from "zod";

// ============================================
// Core Message & Conversation Types
// ============================================

export const MessageSchema = z.object({
  author: z.string(),
  content: z.string(),
  timestamp: z.date().optional(),
});

export type Message = z.infer<typeof MessageSchema>;

export const RawConversationSchema = z.object({
  source: z.enum(["wykop", "twitter", "mock", "improv"]),
  sourceUrl: z.string().optional(),
  messages: z.array(MessageSchema),
  fetchedAt: z.date(),
});

export type RawConversation = z.infer<typeof RawConversationSchema>;

// ============================================
// Bash.org.pl Quote Format
// ============================================

export const QuoteLineSchema = z.object({
  nickname: z.string(),
  text: z.string(),
});

export type QuoteLine = z.infer<typeof QuoteLineSchema>;

export const QuoteMetadataSchema = z.object({
  source: z.string(),
  sourceUrl: z.string().optional(),
  generatedAt: z.date(),
  tags: z.array(z.string()).optional(),
});

export type QuoteMetadata = z.infer<typeof QuoteMetadataSchema>;

export const BashQuoteSchema = z.object({
  id: z.string(),
  lines: z.array(QuoteLineSchema),
  metadata: QuoteMetadataSchema,
});

export type BashQuote = z.infer<typeof BashQuoteSchema>;

// ============================================
// Voting & Judging Types
// ============================================

export const VoteSchema = z.object({
  judgeId: z.string(),
  score: z.number().min(1).max(10),
  criteria: z.string(),
  reasoning: z.string(),
});

export type Vote = z.infer<typeof VoteSchema>;

// ============================================
// Improv Session Types
// ============================================

export const ImprovSessionSchema = z.object({
  id: z.string(),
  topic: z.string(),
  personas: z.array(z.string()),
  generatedQuote: BashQuoteSchema,
  votes: z.array(VoteSchema),
  totalScore: z.number(),
  generatedAt: z.date(),
});

export type ImprovSession = z.infer<typeof ImprovSessionSchema>;

// ============================================
// Workflow Input/Output Schemas
// ============================================

export const QuoteGeneratorInputSchema = z.object({
  source: z.enum(["wykop", "twitter", "mock"]),
  query: z.string().optional(),
});

export type QuoteGeneratorInput = z.infer<typeof QuoteGeneratorInputSchema>;

export const ImprovSessionInputSchema = z.object({
  topic: z.string().describe("Conversation starter or topic"),
  numPersonas: z.number().min(2).max(5).default(3),
  numRounds: z.number().min(2).max(10).default(5),
});

export type ImprovSessionInput = z.infer<typeof ImprovSessionInputSchema>;

export const ImprovSessionOutputSchema = z.object({
  quote: BashQuoteSchema,
  votes: z.array(VoteSchema),
  totalScore: z.number(),
});

export type ImprovSessionOutput = z.infer<typeof ImprovSessionOutputSchema>;

// ============================================
// Persona Configuration
// ============================================

export interface PersonaConfig {
  id: string;
  nickname: string;
  description: string;
  traits: string[];
}

export const PERSONAS: PersonaConfig[] = [
  {
    id: "programmer-persona",
    nickname: "devnull",
    description: "Stereotypical programmer",
    traits: [
      "Overthinks everything",
      "Makes coding jokes",
      "References Stack Overflow",
      "Complains about legacy code",
      "Drinks too much coffee",
    ],
  },
  {
    id: "gamer-persona",
    nickname: "xXx_Pr0Gamer_xXx",
    description: "Hardcore gamer",
    traits: [
      "Uses gaming slang",
      "References popular games",
      "Competitive about everything",
      "Stays up too late",
      "Blames lag for mistakes",
    ],
  },
  {
    id: "boomer-persona",
    nickname: "WojciechXP",
    description: "Tech-confused boomer",
    traits: [
      "Misunderstands technology",
      "Types in ALL CAPS sometimes",
      "References the good old days",
      "Asks obvious questions",
      "Confused by modern slang",
    ],
  },
  {
    id: "student-persona",
    nickname: "eternal_student",
    description: "Perpetual university student",
    traits: [
      "Always procrastinating",
      "Complains about assignments",
      "Lives on instant noodles",
      "Expert at last-minute work",
      "Questions life choices",
    ],
  },
  {
    id: "sysadmin-persona",
    nickname: "root_cause",
    description: "Burned-out sysadmin",
    traits: [
      "Cynical and tired",
      "Always expects systems to fail",
      "Makes dark jokes about uptime",
      "Paranoid about backups",
      "Hates ticket systems",
    ],
  },
];

// ============================================
// Judge Configuration
// ============================================

export interface JudgeConfig {
  id: string;
  criteria: string;
  description: string;
}

export const JUDGES: JudgeConfig[] = [
  {
    id: "humor-judge",
    criteria: "humor",
    description: "Judges overall humor value, timing, and punchlines",
  },
  {
    id: "wit-judge",
    criteria: "wit",
    description: "Judges cleverness, wordplay, and intelligent humor",
  },
  {
    id: "absurdity-judge",
    criteria: "absurdity",
    description: "Judges unexpected twists, surreal logic, and 'wait what?' moments",
  },
];
