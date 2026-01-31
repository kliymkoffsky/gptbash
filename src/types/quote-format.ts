import { z } from 'zod';

export const quoteLineSchema = z.object({
  nick: z.string().min(1),
  message: z.string(),
});

export type QuoteLine = z.infer<typeof quoteLineSchema>;

export const parsedQuoteSchema = z.object({
  lines: z.array(quoteLineSchema).min(1),
});

export type ParsedQuote = z.infer<typeof parsedQuoteSchema>;

const NICK_BODY_REGEX = String.raw`[@+%&~]?[\w\d_\-\[\]\\^{}|` + '`' + String.raw`]+`;
const LINE_REGEX = new RegExp(String.raw`^\s*<(?<nick>${NICK_BODY_REGEX})>\s*(?<message>.*)\s*$`);

export function parseQuoteContent(content: string): ParsedQuote {
  const rawLines = content.split(/\r?\n/);

  const lines: QuoteLine[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i] ?? '';
    const trimmed = raw.trimEnd();

    // Ignore fully blank lines (allows trailing newline in textarea)
    if (trimmed.trim().length === 0) continue;

    const m = trimmed.match(LINE_REGEX);
    const nick = m?.groups?.nick;
    const message = m?.groups?.message ?? '';

    if (!nick) {
      throw new Error(
        `Invalid line ${i + 1}. Expected "<nick> message". Got: "${trimmed}"`
      );
    }

    lines.push({ nick, message });
  }

  return parsedQuoteSchema.parse({ lines });
}

/**
 * Raw textarea input.
 * `parsed` is a derived/internal representation used by the app.
 */
export const rawQuoteInputSchema = z.object({
  content: z.string().trim().min(1, 'Enter quote content'),
  adult: z.boolean().optional(),
});

export const quoteInputToParsedSchema = rawQuoteInputSchema.transform((v) => {
  const parsed = parseQuoteContent(v.content);
  return { ...v, parsed };
});

export type RawQuoteInput = z.infer<typeof rawQuoteInputSchema>;
export type QuoteInputWithParsed = z.infer<typeof quoteInputToParsedSchema>;
