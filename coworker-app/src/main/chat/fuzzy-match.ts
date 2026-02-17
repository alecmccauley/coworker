// ---------------------------------------------------------------------------
// fuzzy-match.ts — Multi-strategy text matching for edit_document
//
// Tries progressively more forgiving strategies to locate `search` inside
// `content`, always enforcing uniqueness (exactly one match) to prevent
// wrong-location edits.
// ---------------------------------------------------------------------------

/** The strategy that produced the match. */
export type MatchStrategy =
  | "exact"
  | "line-based-exact"
  | "trimmed-lines"
  | "collapsed-whitespace"
  | "fuzzy-line-by-line";

export interface FuzzyMatchSuccess {
  ok: true;
  result: {
    startIndex: number;
    endIndex: number;
    matchedText: string;
    strategy: MatchStrategy;
  };
}

export interface FuzzyMatchFailure {
  ok: false;
  error:
    | { kind: "no-match"; message: string }
    | { kind: "ambiguous"; message: string; count: number };
}

export type FuzzyMatchOutcome = FuzzyMatchSuccess | FuzzyMatchFailure;

export interface FuzzyMatchOptions {
  /** Minimum overall similarity for fuzzy matching (0-1). Default 0.85. */
  similarityThreshold?: number;
  /** Minimum search length (chars) to attempt fuzzy matching. Default 20. */
  minFuzzyLength?: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface LineInfo {
  text: string;
  offset: number;
  /** The original line ending (e.g. "\n", "\r\n", or "" for the last line). */
  ending: string;
}

/** Split text into lines while preserving byte offsets and original endings. */
function splitPreservingOffsets(text: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let pos = 0;

  while (pos <= text.length) {
    const nextLF = text.indexOf("\n", pos);
    if (nextLF === -1) {
      // Last line (no trailing newline)
      lines.push({ text: text.slice(pos), offset: pos, ending: "" });
      break;
    }
    const hasCR = nextLF > 0 && text[nextLF - 1] === "\r";
    const lineEnd = hasCR ? nextLF - 1 : nextLF;
    const ending = hasCR ? "\r\n" : "\n";
    lines.push({ text: text.slice(pos, lineEnd), offset: pos, ending });
    pos = nextLF + 1;
  }

  return lines;
}

/** Return the character span [start, end) in the original content for a
 *  contiguous range of matched lines. The trailing ending of the last matched
 *  line is only included when `includeTrailingEnding` is true — this should
 *  reflect whether the original search text ended with a newline. */
function lineRangeSpan(
  lines: LineInfo[],
  firstLine: number,
  lastLine: number,
  includeTrailingEnding: boolean,
): { start: number; end: number } {
  const start = lines[firstLine]!.offset;
  const last = lines[lastLine]!;
  const end = last.offset + last.text.length + (includeTrailingEnding ? last.ending.length : 0);
  return { start, end };
}

type NormalizeFn = (line: string) => string;

/** Generic line-window matcher: normalizes both content and search lines,
 *  then slides a window looking for unique matches. Returns all match
 *  positions (as original character spans). */
function findLineWindowMatches(
  contentLines: LineInfo[],
  searchLines: string[],
  normalize: NormalizeFn,
  includeTrailingEnding: boolean,
): { start: number; end: number }[] {
  const normSearch = searchLines.map(normalize);

  // Drop trailing empty lines from normalized search for more tolerant matching
  while (normSearch.length > 0 && normSearch[normSearch.length - 1] === "") {
    normSearch.pop();
  }

  if (normSearch.length === 0) return [];

  const windowSize = normSearch.length;
  const matches: { start: number; end: number }[] = [];

  for (let i = 0; i <= contentLines.length - windowSize; i++) {
    let ok = true;
    for (let j = 0; j < windowSize; j++) {
      if (normalize(contentLines[i + j]!.text) !== normSearch[j]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      const lastMatchedLine = i + windowSize - 1;
      const span = lineRangeSpan(contentLines, i, lastMatchedLine, includeTrailingEnding);
      matches.push(span);
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Levenshtein with early-exit
// ---------------------------------------------------------------------------

/** Compute Levenshtein distance with an optional max cutoff for early exit. */
function levenshtein(a: string, b: string, max?: number): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Short-circuit if length difference alone exceeds max
  if (max !== undefined && Math.abs(a.length - b.length) > max) return max + 1;

  // Single-row DP
  const row = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) row[j] = j;

  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    let rowMin = row[0]!;

    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(
        row[j]! + 1, // deletion
        row[j - 1]! + 1, // insertion
        prev + cost, // substitution
      );
      prev = row[j]!;
      row[j] = val;
      if (val < rowMin) rowMin = val;
    }

    // Early exit: if every cell in this row exceeds max, no point continuing
    if (max !== undefined && rowMin > max) return max + 1;
  }

  return row[b.length]!;
}

/** Compute similarity (0-1) between two strings using Levenshtein. */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b, maxLen);
  return 1 - dist / maxLen;
}

/** Strip common markdown formatting for fuzzy comparison. */
function stripMarkdown(text: string): string {
  return (
    text
      // Headings: ## Title → Title
      .replace(/^#{1,6}\s+/gm, "")
      // Bold / italic: **text** / __text__ / *text* / _text_
      .replace(/(\*{1,2}|_{1,2})(.+?)\1/g, "$2")
      // Inline code
      .replace(/`([^`]+)`/g, "$1")
      // Block quote markers
      .replace(/^>\s?/gm, "")
      // List markers: - item, * item, 1. item
      .replace(/^(\s*)([-*]|\d+\.)\s+/gm, "$1")
      .trim()
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function fuzzyFindText(
  content: string,
  search: string,
  options?: FuzzyMatchOptions,
): FuzzyMatchOutcome {
  const {
    similarityThreshold = 0.85,
    minFuzzyLength = 20,
  } = options ?? {};

  // -----------------------------------------------------------------------
  // Strategy 1: Exact indexOf
  // -----------------------------------------------------------------------
  {
    const first = content.indexOf(search);
    if (first !== -1) {
      const last = content.lastIndexOf(search);
      if (first === last) {
        return {
          ok: true,
          result: {
            startIndex: first,
            endIndex: first + search.length,
            matchedText: content.slice(first, first + search.length),
            strategy: "exact",
          },
        };
      }
      const count = content.split(search).length - 1;
      return {
        ok: false,
        error: {
          kind: "ambiguous",
          message: `Found ${count} occurrences of the search text. Include more surrounding context to uniquely identify the location.`,
          count,
        },
      };
    }
  }

  // Prepare lines for strategies 2-5
  const contentLines = splitPreservingOffsets(content);
  const searchTextLines = search.split(/\r?\n/);
  const searchEndsWithNewline = search.endsWith("\n") || search.endsWith("\r\n");

  // Helper to produce a unique-match result or error from a list of spans
  const uniqueOrError = (
    matches: { start: number; end: number }[],
    strategy: MatchStrategy,
  ): FuzzyMatchOutcome | null => {
    if (matches.length === 1) {
      const m = matches[0]!;
      return {
        ok: true,
        result: {
          startIndex: m.start,
          endIndex: m.end,
          matchedText: content.slice(m.start, m.end),
          strategy,
        },
      };
    }
    if (matches.length > 1) {
      return {
        ok: false,
        error: {
          kind: "ambiguous",
          message: `Found ${matches.length} occurrences of the search text. Include more surrounding context to uniquely identify the location.`,
          count: matches.length,
        },
      };
    }
    return null; // 0 matches — try next strategy
  };

  // -----------------------------------------------------------------------
  // Strategy 2: Line-based exact (normalizes \r\n vs \n only)
  // -----------------------------------------------------------------------
  {
    const matches = findLineWindowMatches(
      contentLines,
      searchTextLines,
      (line) => line,
      searchEndsWithNewline,
    );
    const result = uniqueOrError(matches, "line-based-exact");
    if (result) return result;
  }

  // -----------------------------------------------------------------------
  // Strategy 3: Trimmed lines (trailing whitespace per line)
  // -----------------------------------------------------------------------
  {
    const matches = findLineWindowMatches(
      contentLines,
      searchTextLines,
      (line) => line.trimEnd(),
      searchEndsWithNewline,
    );
    const result = uniqueOrError(matches, "trimmed-lines");
    if (result) return result;
  }

  // -----------------------------------------------------------------------
  // Strategy 4: Collapsed whitespace (runs of spaces/tabs → single space,
  //             trim each line)
  // -----------------------------------------------------------------------
  {
    const collapse = (line: string): string =>
      line.replace(/[ \t]+/g, " ").trim();
    const matches = findLineWindowMatches(
      contentLines,
      searchTextLines,
      collapse,
      searchEndsWithNewline,
    );
    const result = uniqueOrError(matches, "collapsed-whitespace");
    if (result) return result;
  }

  // -----------------------------------------------------------------------
  // Strategy 5: Fuzzy line-by-line (Levenshtein + markdown stripping)
  // -----------------------------------------------------------------------
  if (search.length >= minFuzzyLength) {
    // Prepare normalized search lines (stripped markdown, collapsed ws, trimmed)
    const normSearchLines = searchTextLines
      .map((l) => stripMarkdown(l).replace(/[ \t]+/g, " ").trim());

    // Drop trailing empty search lines
    while (
      normSearchLines.length > 0 &&
      normSearchLines[normSearchLines.length - 1] === ""
    ) {
      normSearchLines.pop();
    }

    if (normSearchLines.length > 0) {
      const windowSize = normSearchLines.length;
      const PER_LINE_MIN = 0.5;
      const candidates: { start: number; end: number; score: number }[] = [];

      for (let i = 0; i <= contentLines.length - windowSize; i++) {
        let totalSim = 0;
        let skip = false;

        for (let j = 0; j < windowSize; j++) {
          const contentNorm = stripMarkdown(contentLines[i + j]!.text)
            .replace(/[ \t]+/g, " ")
            .trim();
          const searchNorm = normSearchLines[j]!;

          // Both empty → perfect match
          if (contentNorm === "" && searchNorm === "") {
            totalSim += 1;
            continue;
          }

          const sim = similarity(contentNorm, searchNorm);
          if (sim < PER_LINE_MIN) {
            skip = true;
            break;
          }
          totalSim += sim;
        }

        if (skip) continue;

        const avgSim = totalSim / windowSize;
        if (avgSim >= similarityThreshold) {
          const span = lineRangeSpan(contentLines, i, i + windowSize - 1, searchEndsWithNewline);
          candidates.push({ ...span, score: avgSim });
        }
      }

      if (candidates.length === 1) {
        const c = candidates[0]!;
        return {
          ok: true,
          result: {
            startIndex: c.start,
            endIndex: c.end,
            matchedText: content.slice(c.start, c.end),
            strategy: "fuzzy-line-by-line",
          },
        };
      }

      if (candidates.length > 1) {
        // Tiebreak: if one candidate is ≥0.05 better than all others, use it
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0]!;
        const secondBest = candidates[1]!;
        if (best.score - secondBest.score >= 0.05) {
          return {
            ok: true,
            result: {
              startIndex: best.start,
              endIndex: best.end,
              matchedText: content.slice(best.start, best.end),
              strategy: "fuzzy-line-by-line",
            },
          };
        }

        return {
          ok: false,
          error: {
            kind: "ambiguous",
            message: `Found ${candidates.length} similar regions. Include more surrounding context to uniquely identify the location.`,
            count: candidates.length,
          },
        };
      }
    }
  }

  // -----------------------------------------------------------------------
  // No strategy matched
  // -----------------------------------------------------------------------
  const preview = search.length > 80 ? search.slice(0, 80) + "..." : search;
  return {
    ok: false,
    error: {
      kind: "no-match",
      message: `Could not find the text: '${preview}'. Re-read the document and copy text from the output.`,
    },
  };
}
