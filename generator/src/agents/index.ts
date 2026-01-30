/**
 * Agents Index
 *
 * Exports all agents for the quote generator.
 */

export { quoteStylistAgent } from "./quote-stylist.js";
export { personaAgents } from "./personas/index.js";
export { judgeAgents } from "./judges/index.js";

// Re-export individual persona agents
export {
  programmerPersonaAgent,
  gamerPersonaAgent,
  boomerPersonaAgent,
  studentPersonaAgent,
  sysadminPersonaAgent,
} from "./personas/index.js";

// Re-export individual judge agents
export {
  humorJudgeAgent,
  witJudgeAgent,
  absurdityJudgeAgent,
} from "./judges/index.js";
