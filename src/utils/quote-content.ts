/**
 * Quote content helpers.
 *
 * The site stores quotes as plain text. In practice some quotes end up as a single
 * long line containing multiple IRC-style segments like:
 *   "<a> hi <b> yo <c> lol"
 *
 * For display, we want one IRC message per line.
 */
// Keep this intentionally permissive: "<nick>" where nick has no whitespace/angle brackets.
const NICK_TOKEN_REGEX = /<[@+%&~]?[^\s<>]+>/g;
const INLINE_NICK_WITH_SPACES_REGEX = /\s+(<[@+%&~]?[^\s<>]+>)\s+/g;

export function normalizeQuoteContentForDisplay(content: string): string {
  // Some ingestion paths store literal "\n" sequences (e.g. CLI usage).
  // Convert those into real newlines before any other processing.
  let out = content
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  // Some generator flows use a standalone middle dot line as a separator.
  // Drop lines that are just "·".
  out = out.replace(/^\s*·\s*$/gm, '');

  // If a line contains multiple "<nick>" tokens, split them onto new lines.
  // We only split when the token is surrounded by whitespace to avoid breaking
  // things like "<nick>" inside code snippets.
  //
  // Example:
  //   "<a> hi <b> yo" -> "<a> hi\n<b> yo"
  out = out.replace(INLINE_NICK_WITH_SPACES_REGEX, '\n$1 ');

  // Clean up accidental leading/trailing whitespace per line after rewrites.
  out = out
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, idx, arr) => {
      // Keep intentional blank lines between messages, but avoid creating
      // huge runs of empties from separator removal.
      if (l.trim().length > 0) return true;
      const prev = arr[idx - 1];
      return prev?.trim().length > 0;
    })
    .join('\n')
    .trim();

  // Safety: if we somehow stripped everything, fall back to the raw content.
  if (out.length === 0 && content.trim().length > 0) return content;

  // If there are no nick tokens at all, don't force any extra formatting.
  if (!NICK_TOKEN_REGEX.test(out)) return out;

  return out;
}

