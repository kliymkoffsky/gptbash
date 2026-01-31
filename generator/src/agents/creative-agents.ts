import { Agent } from "@mastra/core/agent";
import {
  creativeDirectorInstructions,
  conversationWriterInstructions,
  creativeJudgeInstructions,
} from "../prompts/index.js";

/**
 * Creative Director Agent
 * Generates the entire scene: personas, situations, rules, flavor.
 */
export const creativeDirectorAgent = new Agent({
  id: "creative-director",
  name: "Creative Director",
  model: "anthropic/claude-haiku-4-5-20251001",
  instructions: creativeDirectorInstructions,
});

/**
 * Conversation Writer Agent
 * Writes dynamic chat conversations like sitcom dialogue.
 */
export const conversationWriterAgent = new Agent({
  id: "conversation-writer",
  name: "Conversation Writer",
  model: "anthropic/claude-haiku-4-5-20251001",
  instructions: conversationWriterInstructions,
});

/**
 * Creative Judge Agent
 * Evaluates quotes with randomly generated judge personas.
 */
export const creativeJudgeAgent = new Agent({
  id: "creative-judge",
  name: "Creative Judge",
  model: "anthropic/claude-haiku-4-5-20251001",
  instructions: creativeJudgeInstructions,
});

// Export all for registration
export const creativeAgents = {
  "creative-director": creativeDirectorAgent,
  "conversation-writer": conversationWriterAgent,
  "creative-judge": creativeJudgeAgent,
};
