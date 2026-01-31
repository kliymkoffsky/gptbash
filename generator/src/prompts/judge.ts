/**
 * Prompt for judging a conversation
 */
export function judgePrompt(
  quoteText: string,
  topic: string,
  flavor: string
): string {
  return `Rate this conversation.

QUOTE:
${quoteText}

TOPIC: "${topic}"
ATMOSPHERE: ${flavor}

Create 2-3 judges with unique criteria that will help create a banger. We need dynamics in all directions, length, style, writing styles.  Each rates 1-10 .
Every judge should rate the conversation in a different direction.

But we look for a banger factor, so we need to find the best judge that will help us create a banger.

JSON:
{
  "judges": [{"name": "name", "criteria": "direction", "score": x, "reasoning": "brief"}],
  "overallComments": ["1-2 comments"]
}

ONLY JSON:`;
}
