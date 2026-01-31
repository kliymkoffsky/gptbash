/**
 * Random Situations and Backstories
 *
 * These provide context for each persona in a conversation.
 * Each person gets a unique situation that affects how they respond.
 */

export interface PersonaSituation {
  mood: string;
  context: string;
  secret?: string;
}

// Current moods
const MOODS = [
  "zdenerwowany bo właśnie coś się zepsuło",
  "zmęczony, nie spał całą noc",
  "w świetnym humorze, dostał podwyżkę",
  "zestresowany deadlinem",
  "znudzony, szuka rozrywki",
  "podekscytowany nowym projektem",
  "cyniczny po spotkaniu z klientem",
  "na kacu",
  "głodny, czeka na pizzę",
  "w trakcie rozmowy z supportem",
  "właśnie dostał awans",
  "właśnie został zwolniony",
  "w pracy ale mentalnie na wakacjach",
  "próbuje wyglądać na zajętego",
  "ukrywa się przed szefem",
];

// Situational contexts
const CONTEXTS = [
  "jest piątek 17:00",
  "jest poniedziałek 8:00",
  "jest 3 w nocy",
  "trwa awaria produkcji",
  "jest demo dla klienta za godzinę",
  "wszyscy są na urlopie oprócz niego",
  "właśnie skończył się sprint",
  "jest dzień wypłaty",
  "internet pada co 5 minut",
  "szef stoi za plecami",
  "jest review kodu",
  "deploy poszedł nie tak",
  "ktoś właśnie pushnął na maina",
  "jest retrospektywa",
  "kawa się skończyła",
  "klimatyzacja nie działa",
  "jest hackathon firmowy",
  "audyt bezpieczeństwa",
];

// Secret motivations (optional, makes conversations spicier)
const SECRETS = [
  "szuka nowej pracy",
  "właśnie złożył wypowiedzenie",
  "ma wywiad za godzinę",
  "to on zepsuł produkcję ale nikt nie wie",
  "gra w grę podczas pracy",
  "ogląda serial na drugim monitorze",
  "jest na randce przez telefon",
  "planuje zemstę na koledze",
  "ma imposter syndrome",
  "udaje że wie o czym mowa",
  "próbuje ukraść pomysł",
  "jest pod wpływem",
  "to jego ostatni dzień",
  "właśnie odkrył bug który istnieje od lat",
  null, // no secret
  null,
  null,
];

/**
 * Generate a random situation for a persona
 */
export function generateSituation(): PersonaSituation {
  const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  const context = CONTEXTS[Math.floor(Math.random() * CONTEXTS.length)];
  const secretRoll = SECRETS[Math.floor(Math.random() * SECRETS.length)];

  return {
    mood,
    context,
    secret: secretRoll || undefined,
  };
}

/**
 * Generate situations for multiple personas
 */
export function generateSituations(count: number): PersonaSituation[] {
  return Array.from({ length: count }, () => generateSituation());
}

/**
 * Format situation as prompt context
 */
export function formatSituationForPrompt(situation: PersonaSituation): string {
  let prompt = `Twoja obecna sytuacja: ${situation.mood}. ${situation.context}.`;
  if (situation.secret) {
    prompt += ` (Twój sekret: ${situation.secret} - możesz subtelnie nawiązywać)`;
  }
  return prompt;
}

/**
 * Random conversation length (1-3 people, 3-7 rounds)
 */
export function randomConversationParams(): { numPersonas: number; numRounds: number } {
  const numPersonas = Math.floor(Math.random() * 3) + 1; // 1-3
  const numRounds = Math.floor(Math.random() * 5) + 3; // 3-7
  return { numPersonas, numRounds };
}
