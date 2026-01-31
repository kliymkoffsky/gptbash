/**
 * Prompt for generating random topics in a category
 */
export function topicsPrompt(category: string, count: number): string {
  return `Generate ${count} funny conversation topics for category: "${category}"

RULES:
- specific situations, not generic
- awkward, stupid, or absurd scenarios
- things people argue about online

Return JSON array of strings:
["topic 1", "topic 2", "topic 3"]

ONLY JSON:`;
}
