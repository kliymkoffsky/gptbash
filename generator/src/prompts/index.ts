// Scene generation
export { sceneGeneratorPrompt } from "./scene-generator.js";

// Conversation writing
export { conversationWriterPrompt } from "./conversation-writer.js";

// Judging
export { judgePrompt } from "./judge.js";

// Improvement
export { improvePrompt } from "./improve.js";

// Translation
export { translatePrompt } from "./translate.js";

// Topic generation
export { topicsPrompt } from "./topics.js";

// One shot (simple)
export { oneShotPrompt } from "./one-shot.js";

// Raw shot (text format)
export { rawShotPrompt } from "./raw-shot.js";

// Formats
export { FORMATS, getRandomFormat } from "./formats.js";
export type { Format, FormatType } from "./formats.js";

// Agent instructions
export {
  creativeDirectorInstructions,
  conversationWriterInstructions,
  creativeJudgeInstructions,
} from "./agents.js";
