import chalk from "chalk";

/**
 * Logger Utility
 *
 * Colorful, structured logging for the quote generator.
 */

// Symbols for different log levels
const symbols = {
  success: chalk.green("✓"),
  error: chalk.red("✗"),
  warning: chalk.yellow("⚠"),
  info: chalk.blue("ℹ"),
  debug: chalk.gray("●"),
  step: chalk.cyan("→"),
  bullet: chalk.gray("•"),
};

// Prefixes for different components
const prefixes = {
  redis: chalk.magenta("[Redis]"),
  workflow: chalk.cyan("[Workflow]"),
  agent: chalk.yellow("[Agent]"),
  judge: chalk.blue("[Judge]"),
  persona: chalk.green("[Persona]"),
  memory: chalk.red("[Memory]"),
  rate: chalk.gray("[RateLimit]"),
  storage: chalk.magenta("[Storage]"),
  system: chalk.white("[System]"),
};

export const log = {
  // ============================================
  // Basic Logging
  // ============================================

  success: (message: string) => {
    console.log(`${symbols.success} ${chalk.green(message)}`);
  },

  error: (message: string, error?: Error | unknown) => {
    console.log(`${symbols.error} ${chalk.red(message)}`);
    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`  ${chalk.gray(errorMsg)}`);
    }
  },

  warning: (message: string) => {
    console.log(`${symbols.warning} ${chalk.yellow(message)}`);
  },

  info: (message: string) => {
    console.log(`${symbols.info} ${chalk.blue(message)}`);
  },

  debug: (message: string) => {
    if (process.env.DEBUG) {
      console.log(`${symbols.debug} ${chalk.gray(message)}`);
    }
  },

  step: (message: string) => {
    console.log(`${symbols.step} ${message}`);
  },

  // ============================================
  // Component-Specific Logging
  // ============================================

  redis: {
    connected: () => {
      console.log(`${prefixes.redis} ${symbols.success} ${chalk.green("Connected")}`);
    },
    disconnected: () => {
      console.log(`${prefixes.redis} ${symbols.info} ${chalk.gray("Disconnected")}`);
    },
    error: (message: string) => {
      console.log(`${prefixes.redis} ${symbols.error} ${chalk.red(message)}`);
    },
    notAvailable: () => {
      console.log(`${prefixes.redis} ${symbols.warning} ${chalk.yellow("Not available - running without persistence")}`);
      console.log(`  ${chalk.gray("Install Redis or use --no-storage flag")}`);
    },
  },

  workflow: {
    start: (name: string, topic?: string) => {
      console.log();
      console.log(chalk.cyan.bold(`━━━ ${name} ━━━`));
      if (topic) {
        console.log(`${prefixes.workflow} Topic: ${chalk.white.bold(`"${topic}"`)}`);
      }
    },
    step: (stepName: string) => {
      console.log(`${prefixes.workflow} ${symbols.step} ${stepName}`);
    },
    success: (message: string) => {
      console.log(`${prefixes.workflow} ${symbols.success} ${chalk.green(message)}`);
    },
    error: (message: string, error?: Error | unknown) => {
      console.log(`${prefixes.workflow} ${symbols.error} ${chalk.red(message)}`);
      if (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ${chalk.gray(errorMsg)}`);
      }
    },
  },

  agent: {
    calling: (agentId: string) => {
      console.log(`${prefixes.agent} ${symbols.step} Calling ${chalk.yellow(agentId)}...`);
    },
    response: (agentId: string) => {
      console.log(`${prefixes.agent} ${symbols.success} ${chalk.yellow(agentId)} responded`);
    },
    error: (agentId: string, error?: Error | unknown) => {
      console.log(`${prefixes.agent} ${symbols.error} ${chalk.yellow(agentId)} ${chalk.red("failed")}`);
      if (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        // Truncate long error messages
        const short = errorMsg.length > 80 ? errorMsg.slice(0, 77) + "..." : errorMsg;
        console.log(`  ${chalk.gray(short)}`);
      }
    },
    noApiKey: () => {
      console.log(`${prefixes.agent} ${symbols.warning} ${chalk.yellow("No API key - using fallback responses")}`);
    },
  },

  persona: {
    selected: (personas: string[]) => {
      console.log(`${prefixes.persona} Selected: ${personas.map(p => chalk.green(p)).join(", ")}`);
    },
    speaking: (nickname: string, round: number) => {
      console.log(`${prefixes.persona} ${chalk.green(nickname)} ${chalk.gray(`(round ${round})`)}`);
    },
    situation: (nickname: string, mood: string, context: string) => {
      console.log(`${prefixes.persona} ${chalk.cyan(nickname)}: ${chalk.gray(mood)} | ${chalk.gray(context)}`);
    },
  },

  judge: {
    voting: () => {
      console.log(`${prefixes.judge} ${symbols.step} Judges voting...`);
    },
    vote: (judgeId: string, score: number, maxScore: number = 10) => {
      const color = score >= 7 ? chalk.green : score >= 5 ? chalk.yellow : chalk.red;
      const bar = createProgressBar(score, maxScore, 10);
      console.log(`${prefixes.judge} ${chalk.blue(judgeId.padEnd(15))} ${bar} ${color(score)}/${maxScore}`);
    },
    total: (score: number, maxScore: number) => {
      const avg = score / (maxScore / 10);
      const color = avg >= 7 ? chalk.green : avg >= 5 ? chalk.yellow : chalk.red;
      console.log(`${prefixes.judge} ${chalk.bold("Total:")} ${color.bold(`${score}/${maxScore}`)} (avg: ${avg.toFixed(1)})`);
    },
  },

  memory: {
    status: (usedPercent: number) => {
      const color = usedPercent >= 95 ? chalk.red : usedPercent >= 80 ? chalk.yellow : chalk.green;
      const bar = createProgressBar(usedPercent, 100, 20);
      console.log(`${prefixes.memory} Usage: ${bar} ${color(`${usedPercent.toFixed(1)}%`)}`);
    },
    warning: (message: string) => {
      console.log(`${prefixes.memory} ${symbols.warning} ${chalk.yellow(message)}`);
    },
    cleanup: (count: number, freedMB: number) => {
      console.log(`${prefixes.memory} ${symbols.success} Cleaned ${count} items (freed ${freedMB.toFixed(1)}MB)`);
    },
  },

  rate: {
    status: (remaining: number, max: number) => {
      console.log(`${prefixes.rate} ${remaining}/${max} requests remaining`);
    },
    exceeded: (retryInSeconds: number) => {
      console.log(`${prefixes.rate} ${symbols.error} ${chalk.red(`Rate limit exceeded. Retry in ${retryInSeconds}s`)}`);
    },
  },

  storage: {
    saved: (id: string, status: string) => {
      const statusColor = status === "approved" || status === "starred" ? chalk.green : chalk.red;
      console.log(`${prefixes.storage} ${symbols.success} Saved ${chalk.gray(id)} as ${statusColor(status)}`);
    },
  },

  // ============================================
  // Quote Display
  // ============================================

  quote: {
    display: (quote: { id: string; lines: { nickname: string; text: string }[] }) => {
      console.log();
      console.log(chalk.yellow("━".repeat(50)));
      console.log(chalk.white.bold(` #${quote.id}`));
      console.log(chalk.yellow("━".repeat(50)));
      quote.lines.forEach((line, i) => {
        const nick = chalk.cyan(`<${line.nickname}>`);
        console.log(`${nick} ${line.text}`);
        // Add separator between messages for readability
        if (i < quote.lines.length - 1) {
          console.log(chalk.gray("·"));
        }
      });
      console.log(chalk.yellow("━".repeat(50)));
    },
  },

  // ============================================
  // Approval Decision
  // ============================================

  approval: {
    approved: (reason: string) => {
      console.log();
      console.log(`${chalk.bgGreen.black.bold(" ✓ APPROVED ")} ${chalk.green(reason)}`);
    },
    starred: (reason: string) => {
      console.log();
      console.log(`${chalk.bgYellow.black.bold(" ⭐ STARRED ")} ${chalk.yellow(reason)}`);
    },
    rejected: (reason: string) => {
      console.log();
      console.log(`${chalk.bgRed.white.bold(" ✗ REJECTED ")} ${chalk.red(reason)}`);
    },
  },

  // ============================================
  // Headers & Dividers
  // ============================================

  header: (title: string) => {
    console.log();
    console.log(chalk.cyan.bold("╔" + "═".repeat(56) + "╗"));
    console.log(chalk.cyan.bold("║") + chalk.white.bold(title.padStart(28 + title.length / 2).padEnd(56)) + chalk.cyan.bold("║"));
    console.log(chalk.cyan.bold("╚" + "═".repeat(56) + "╝"));
    console.log();
  },

  divider: () => {
    console.log(chalk.gray("─".repeat(58)));
  },

  blank: () => {
    console.log();
  },
};

// ============================================
// Helpers
// ============================================

function createProgressBar(value: number, max: number, width: number): string {
  const filled = Math.round((value / max) * width);
  const empty = width - filled;

  const filledColor = value / max >= 0.8 ? chalk.red : value / max >= 0.6 ? chalk.yellow : chalk.green;

  return chalk.gray("[") + filledColor("█".repeat(filled)) + chalk.gray("░".repeat(empty)) + chalk.gray("]");
}

export default log;
