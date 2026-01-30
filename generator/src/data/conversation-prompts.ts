/**
 * Starter prompts for improv mode conversations
 * These topics are designed to spark funny IRC-style banter
 */

export const improvPrompts: string[] = [
  // Programming & Tech
  "Someone asks for help with a 'simple' regex",
  "The production server is down on a Friday at 5pm",
  "The intern pushed to main without testing",
  "Debating tabs vs spaces at 3am",
  "Someone says 'it works on my machine'",
  "The client wants 'just a small change'",
  "Explaining what you do for work to your parents",
  "The standup meeting that could have been an email",
  "Legacy code comments from 2008",
  "Docker container won't start",

  // Gaming
  "Explaining to parents that you can't pause an online game",
  "The teammate who 'carries' but has 0 kills",
  "Lag blamed for every death",
  "Microtransactions in a $60 game",
  "The tutorial that takes 2 hours",

  // Modern Life
  "Explaining NFTs to your grandparents",
  "AI will take our jobs discussion",
  "Smart home devices having an existential crisis",
  "The WiFi password at family gatherings",
  "Working from home but your cat disagrees",

  // Classic IRC
  "Someone joins the channel asking 'anyone here?'",
  "The bot that responds to everything",
  "Channel drama from 10 years ago resurfaces",
  "Someone discovers the channel after years of inactivity",

  // Office Life
  "The coffee machine is broken again",
  "Reply-all apocalypse",
  "Mandatory fun team building exercise",
  "The printer that only works on Tuesdays",
  "Open office plan complaints",

  // Student Life
  "Deadline is tomorrow, Netflix is calling",
  "The group project where one person does everything",
  "Explaining your thesis topic to anyone",
  "The professor who doesn't believe in deadlines",
];

/**
 * Get a random conversation prompt
 */
export function getRandomPrompt(): string {
  const index = Math.floor(Math.random() * improvPrompts.length);
  return improvPrompts[index];
}

/**
 * Get multiple random prompts (non-repeating)
 */
export function getRandomPrompts(count: number): string[] {
  const shuffled = [...improvPrompts].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
