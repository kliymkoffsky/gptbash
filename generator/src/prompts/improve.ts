/**
 * Prompt for improving a conversation based on judge feedback
 */
export function improvePrompt(
  originalConversation: string,
  feedback: string[],
  score: number
): string {
  return `Improve. Score: ${score}/30.

ORIGINAL:
${originalConversation}

FEEDBACK:
${feedback.map(f => `- ${f}`).join("\n")}

MAKE FUNNIER:
- people being WRONG and STUPID
- bad logic, dumb takes
- typos (teh, ur, becuase)
- lazy lowercase or random CAPS
- 3-12 words per message

[{"author": "nick", "content": "text"}]

JSON:`;
}
