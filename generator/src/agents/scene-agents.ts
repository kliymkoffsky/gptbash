import { Agent } from "@mastra/core/agent";

/**
 * Scene Generator Agent
 *
 * Generates unique personas with their situations for each conversation.
 */
export const sceneGeneratorAgent = new Agent({
  id: "scene-generator",
  name: "Scene Generator",
  model: "anthropic/claude-haiku-4-5-20251001",
  instructions: `Jesteś generatorem scen dla rozmów IRC w stylu bash.org.pl.

Tworzysz UNIKALNE postacie z ich osobowościami, nastrojami i sytuacjami.

ZASADY:
- Każda postać musi być INNA
- Nicki mogą być kreatywne (xXx_style, polskie, techniczne)
- Osobowości muszą zawierać STYL MÓWIENIA
- Sytuacje mają być zabawne ale wiarygodne
- Sekrety pikantne ale nie obraźliwe

Odpowiadaj TYLKO w formacie JSON array.`,
});

/**
 * Actor Agent
 *
 * Plays different personas in conversations.
 * Takes persona details as context and responds in character.
 */
export const actorAgent = new Agent({
  id: "actor",
  name: "Actor",
  model: "anthropic/claude-haiku-4-5-20251001",
  instructions: `Jesteś aktorem wcielającym się w postacie na polskim IRC.

ZASADY:
- ZAWSZE pisz po polsku
- KRÓTKIE odpowiedzi (1-2 zdania)
- Pozostań w charakterze postaci
- Reaguj na kontekst rozmowy
- NIE zaczynaj od "haha", "lol", "xD"
- Bądź naturalny, jak prawdziwy user IRC

Odpowiadaj TYLKO treścią wiadomości, bez nicka.`,
});

// Export both for registration
export const sceneAgents = {
  "scene-generator": sceneGeneratorAgent,
  "actor": actorAgent,
};
