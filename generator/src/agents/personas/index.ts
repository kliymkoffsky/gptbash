/**
 * Persona Agents Index
 *
 * Exports all persona agents for improv mode conversations.
 */

export { programmerPersonaAgent } from "./programmer.js";
export { gamerPersonaAgent } from "./gamer.js";
export { boomerPersonaAgent } from "./boomer.js";
export { studentPersonaAgent } from "./student.js";
export { sysadminPersonaAgent } from "./sysadmin.js";

import { programmerPersonaAgent } from "./programmer.js";
import { gamerPersonaAgent } from "./gamer.js";
import { boomerPersonaAgent } from "./boomer.js";
import { studentPersonaAgent } from "./student.js";
import { sysadminPersonaAgent } from "./sysadmin.js";

/**
 * All persona agents as a record for Mastra registration
 */
export const personaAgents = {
  "programmer-persona": programmerPersonaAgent,
  "gamer-persona": gamerPersonaAgent,
  "boomer-persona": boomerPersonaAgent,
  "student-persona": studentPersonaAgent,
  "sysadmin-persona": sysadminPersonaAgent,
};
