/**
 * API Key Check Utility
 *
 * Checks if API keys are available for AI agents.
 */

let apiKeyWarningShown = false;

/**
 * Check if we have a valid API key for agents
 */
export function hasApiKey(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
}

/**
 * Show API key warning (only once)
 */
export function showApiKeyWarning(): void {
  if (!apiKeyWarningShown && !hasApiKey()) {
    apiKeyWarningShown = true;
  }
}

/**
 * Reset warning flag (for testing)
 */
export function resetApiKeyWarning(): void {
  apiKeyWarningShown = false;
}
