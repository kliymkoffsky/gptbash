import type { RawConversation } from "../types/index.js";

export const mockConversations: RawConversation[] = [
  {
    source: "mock",
    messages: [
      { author: "dev1", content: "Jak wyjść z vima?" },
      { author: "dev2", content: "Restart komputera" },
      { author: "dev1", content: "A bez restartowania?" },
      { author: "dev2", content: "Zmień pracę" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "junior", content: "Zrobiłem push do maina" },
      { author: "senior", content: "..." },
      { author: "junior", content: "Bez testów" },
      { author: "senior", content: "..." },
      { author: "junior", content: "W piątek o 17:00" },
      { author: "senior", content: "Aktualizuję CV" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "admin", content: "Mamy backupy?" },
      { author: "dev", content: "Teoretycznie tak" },
      { author: "admin", content: "A praktycznie?" },
      { author: "dev", content: "Teoretycznie tak" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "PM", content: "To prosty feature, max 2 dni" },
      { author: "dev", content: "Kto to oszacował?" },
      { author: "PM", content: "Ja" },
      { author: "dev", content: "A umiesz programować?" },
      { author: "PM", content: "Nie, ale Excel znam" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "user1", content: "Regex to łatwe" },
      { author: "user2", content: "Napisz regex na email" },
      { author: "user1", content: "^[a-zA-Z0-9... czekaj" },
      { author: "user1", content: "Muszę sprawdzić na Stack Overflow" },
      { author: "user2", content: "Mówiłeś że łatwe" },
      { author: "user1", content: "Koncepcyjnie łatwe" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "tata", content: "SYNU JAK WŁĄCZYĆ INTERNET" },
      { author: "syn", content: "Kliknij na przeglądarkę" },
      { author: "tata", content: "JAKA PRZEGLĄDARKA" },
      { author: "syn", content: "Ta niebieska ikonka" },
      { author: "tata", content: "WORD?" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "gamer", content: "gram już 36h bez przerwy" },
      { author: "friend", content: "idź spać" },
      { author: "gamer", content: "nie mogę, jestem w rankingu" },
      { author: "friend", content: "jakim?" },
      { author: "gamer", content: "najdłużej grających bez snu" },
    ],
    fetchedAt: new Date(),
  },
  {
    source: "mock",
    messages: [
      { author: "student", content: "mam deadline za 2h" },
      { author: "kolega", content: "ile zrobiłeś?" },
      { author: "student", content: "tytuł" },
      { author: "kolega", content: "przynajmniej masz plan?" },
      { author: "student", content: "tak, kawa i modlitwa" },
    ],
    fetchedAt: new Date(),
  },
];

/**
 * Get a random mock conversation
 */
export function getRandomMockConversation(): RawConversation {
  const index = Math.floor(Math.random() * mockConversations.length);
  return mockConversations[index];
}

/**
 * Get all mock conversations
 */
export function getAllMockConversations(): RawConversation[] {
  return mockConversations;
}
