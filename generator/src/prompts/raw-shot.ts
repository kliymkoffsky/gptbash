/**
 * Raw one-shot - simple text format
 */
export function rawShotPrompt(topic: string): string {
  const seed = Math.floor(Math.random() * 99999);
  const nickStyles = ["gamer tag", "ironic handle", "boomer username", "edgy teen", "corporate drone"];
  const style = nickStyles[Math.floor(Math.random() * nickStyles.length)];
  
  return `Write an ORIGINAL funny chat conversation.

Topic: ${topic}
Nick style: ${style}
Seed: ${seed}

Rules:
- Format each line as: <nickname> message
- 3-5 messages total
- Someone must be confidently WRONG
- Varying message lengths
- Be creative and surprising

Output only the chat lines, nothing else:`;
}
