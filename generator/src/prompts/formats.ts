/**
 * Conversation format presets
 */

export type FormatType = "micro" | "short" | "medium" | "standard";

export interface Format {
  name: string;
  messages: number;
  personas: number;
  description: string;
}

export const FORMATS: Record<FormatType, Format> = {
  micro: {
    name: "micro",
    messages: 3,
    personas: 2,
    description: "3 messages - quick hit",
  },
  short: {
    name: "short", 
    messages: 5,
    personas: 2,
    description: "5 messages - solid exchange",
  },
  medium: {
    name: "medium",
    messages: 7,
    personas: 2,
    description: "7 messages - full buildup",
  },
  standard: {
    name: "standard",
    messages: 10,
    personas: 3,
    description: "10 messages - epic scene",
  },
};

export function getRandomFormat(): Format {
  const types: FormatType[] = ["micro", "short", "medium", "standard"];
  const random = types[Math.floor(Math.random() * types.length)];
  return FORMATS[random];
}
