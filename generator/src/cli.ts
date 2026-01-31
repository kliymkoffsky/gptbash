#!/usr/bin/env tsx
/**
 * CLI Wrapper
 *
 * Runs the generator with clean output by suppressing Mastra's verbose errors.
 */

// Suppress Mastra's verbose stderr output when no API key
const originalStderrWrite = process.stderr.write.bind(process.stderr);
const suppressPatterns = [
  "Error executing step",
  "Message with role",
  "at MessageList",
  "at Object.execute",
  "at runStep",
  "at DefaultExecutionEngine",
  "at executeStep",
  "at async",
  "MastraError",
  "INVALID_MESSAGE_CONTENT",
];

process.stderr.write = (chunk: any, ...args: any[]): boolean => {
  const str = String(chunk);
  
  // Check if this line matches any suppression pattern
  const shouldSuppress = suppressPatterns.some((pattern) => str.includes(pattern));
  
  if (shouldSuppress) {
    return true; // Pretend we wrote it
  }
  
  return originalStderrWrite(chunk, ...args);
};

// Now run the main module
import("./index.js").catch((error) => {
  console.error("Failed to start:", error.message);
  process.exit(1);
});
