/**
 * Judge Agents Index
 *
 * Exports all judge agents for voting on quotes.
 */

export { humorJudgeAgent } from "./humor-judge.js";
export { witJudgeAgent } from "./wit-judge.js";
export { absurdityJudgeAgent } from "./absurdity-judge.js";

import { humorJudgeAgent } from "./humor-judge.js";
import { witJudgeAgent } from "./wit-judge.js";
import { absurdityJudgeAgent } from "./absurdity-judge.js";

/**
 * All judge agents as a record for Mastra registration
 */
export const judgeAgents = {
  "humor-judge": humorJudgeAgent,
  "wit-judge": witJudgeAgent,
  "absurdity-judge": absurdityJudgeAgent,
};
