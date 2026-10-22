export type WordStatus = "correct" | "wrong" | "skipped" | "pending";
export interface WordDiffResult {
  word: string;
  status: WordStatus;
}
export interface TypingDiff {
  results: WordDiffResult[];
  correctWords: number;
  wrongWords: number;
  skippedWords: number;
  /** Effective correctly-scored characters (typed characters minus edit errors). */
  correctChars: number;
  typedChars: number;
  /** Character-level edit errors, not the number of whole words marked wrong. */
  errors: number;
}

export interface TypingMetrics {
  wpm: number;
  rawWpm: number;
  accuracy: number;
  errors: number;
  correctChars: number;
  typedChars: number;
}

const LOOKAHEAD = 3;

/**
 * Optimal-string-alignment distance (Damerau–Levenshtein variant).
 * Adjacent transposition ("teh" vs "the") is one edit; inserted, deleted,
 * or substituted characters are also counted as one edit each.
 */
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitutionCost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        best = Math.min(best, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = best;
    }
  }

  return dp[a.length][b.length];
}

/** Minimum edit distance between input and any prefix of target. */
function editDistanceToAnyPrefix(input: string, target: string): number {
  const dp = Array.from({ length: input.length + 1 }, () => new Array<number>(target.length + 1).fill(0));
  for (let i = 0; i <= input.length; i++) dp[i][0] = i;
  for (let j = 0; j <= target.length; j++) dp[0][j] = j;

  for (let i = 1; i <= input.length; i++) {
    for (let j = 1; j <= target.length; j++) {
      const substitutionCost = input[i - 1] === target[j - 1] ? 0 : 1;
      let best = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + substitutionCost,
      );
      if (
        i > 1 &&
        j > 1 &&
        input[i - 1] === target[j - 2] &&
        input[i - 2] === target[j - 1]
      ) {
        best = Math.min(best, dp[i - 2][j - 2] + 1);
      }
      dp[i][j] = best;
    }
  }

  return Math.min(...dp[input.length]);
}

function extraWhitespaceErrors(typed: string): number {
  const leadingWhitespace = typed.match(/^\s+/)?.[0].length ?? 0;
  const trailingWhitespace = typed.match(/\s+$/)?.[0].length ?? 0;
  const body = typed.trim();
  const repeatedWhitespace = [...body.matchAll(/\s{2,}/g)]
    .reduce((sum, match) => sum + Math.max(0, (match[0]?.length ?? 1) - 1), 0);

  // A single trailing separator is allowed because typing the next word
  // normally requires it; multiple spaces and leading spaces are extra input.
  return leadingWhitespace + Math.max(0, trailingWhitespace - 1) + repeatedWhitespace;
}

export function diffWords(typed: string, target: string): TypingDiff {
  const endsWithSpace = /\s$/.test(typed);
  const allTypedWords = typed.trim().length ? typed.trim().split(/\s+/) : [];
  let partial = "";
  if (!endsWithSpace && allTypedWords.length > 0) {
    partial = allTypedWords.pop() as string;
  }
  const targetWords = target.trim().length ? target.trim().split(/\s+/) : [];
  const results: WordDiffResult[] = [];
  let errors = extraWhitespaceErrors(typed);
  let ti = 0;
  let gi = 0;

  while (gi < targetWords.length && ti < allTypedWords.length) {
    const typedWord = allTypedWords[ti];
    const targetWord = targetWords[gi];

    if (typedWord === targetWord) {
      results.push({ word: targetWord, status: "correct" });
      ti++;
      gi++;
      continue;
    }

    // A missing space can combine otherwise-correct target words into one
    // typed token. Count the missing separators, not every letter in the words.
    let joinedTargetCount = 0;
    for (let k = 1; k <= LOOKAHEAD && gi + k < targetWords.length; k++) {
      if (typedWord === targetWords.slice(gi, gi + k + 1).join("")) {
        joinedTargetCount = k + 1;
        break;
      }
    }
    if (joinedTargetCount > 1) {
      for (let j = 0; j < joinedTargetCount; j++) {
        results.push({ word: targetWords[gi + j], status: "correct" });
      }
      errors += joinedTargetCount - 1;
      ti++;
      gi += joinedTargetCount;
      continue;
    }

    let skipK = -1;
    for (let k = 1; k <= LOOKAHEAD && gi + k < targetWords.length; k++) {
      if (typedWord === targetWords[gi + k]) {
        skipK = k;
        break;
      }
    }
    if (skipK > 0) {
      for (let j = 0; j < skipK; j++) {
        results.push({ word: targetWords[gi + j], status: "skipped" });
        errors += targetWords[gi + j].length;
      }
      gi += skipK;
      continue;
    }

    let extraK = -1;
    for (let k = 1; k <= LOOKAHEAD && ti + k < allTypedWords.length; k++) {
      if (allTypedWords[ti + k] === targetWord) {
        extraK = k;
        break;
      }
    }
    if (extraK > 0) {
      for (let j = 0; j < extraK; j++) {
        errors += allTypedWords[ti + j].length;
      }
      ti += extraK;
      continue;
    }

    // Mark the whole word for on-screen feedback, but penalise only the actual
    // character edits in the result score.
    errors += editDistance(typedWord, targetWord);
    results.push({ word: targetWord, status: "wrong" });
    ti++;
    gi++;
  }

  const pendingStart = gi;
  for (; gi < targetWords.length; gi++) {
    results.push({ word: targetWords[gi], status: "pending" });
  }

  // Any completed words after the target text are extra typed characters.
  for (; ti < allTypedWords.length; ti++) {
    errors += allTypedWords[ti].length;
  }

  if (partial) {
    if (pendingStart >= targetWords.length) {
      errors += partial.length;
    } else {
      // Look ahead for a partial token that belongs to a later target word.
      // This prevents a missing word from being misreported as several typos
      // in the next word when the test expires before a trailing space is typed.
      let bestSkip = 0;
      let bestCost = editDistanceToAnyPrefix(partial, targetWords[pendingStart]);

      for (let k = 1; k <= LOOKAHEAD && pendingStart + k < targetWords.length; k++) {
        const skippedLength = targetWords
          .slice(pendingStart, pendingStart + k)
          .reduce((sum, word) => sum + word.length, 0);
        const distance = editDistanceToAnyPrefix(partial, targetWords[pendingStart + k]);
        const cost = skippedLength + distance;
        if (cost < bestCost) {
          bestSkip = k;
          bestCost = cost;
        }

        // Also consider a partially typed pair of words with the separating
        // space missing, e.g. "hellow" against the target "hello world".
        const joinedTarget = targetWords.slice(pendingStart, pendingStart + k + 1).join("");
        const joinedDistance = editDistanceToAnyPrefix(partial, joinedTarget) + k;
        if (joinedDistance < bestCost) {
          bestSkip = -k;
          bestCost = joinedDistance;
        }
      }

      if (bestSkip > 0) {
        for (let j = 0; j < bestSkip; j++) {
          results[pendingStart + j] = { word: targetWords[pendingStart + j], status: "skipped" };
        }
      }
      errors += bestCost;
    }
  }

  const correctWords = results.filter((r) => r.status === "correct").length;
  const wrongWords = results.filter((r) => r.status === "wrong").length;
  const skippedWords = results.filter((r) => r.status === "skipped").length;
  const typedChars = typed.length;
  const wholeErrors = Math.max(0, Math.trunc(errors));

  return {
    results,
    correctWords,
    wrongWords,
    skippedWords,
    typedChars,
    errors: wholeErrors,
    correctChars: Math.max(0, typedChars - wholeErrors),
  };
}

/**
 * Shared scoring formula used by live stats, per-second chart samples, and the
 * final result:
 * gross WPM = typed characters / 5 / minutes
 * net WPM = gross WPM - character-edit errors per minute.
 */
export function calculateTypingMetrics(
  typed: string,
  target: string,
  durationSeconds: number,
): TypingMetrics {
  const diff = diffWords(typed, target);
  const elapsedMinutes = Math.max(1, durationSeconds) / 60;
  const rawExact = diff.typedChars / 5 / elapsedMinutes;
  const netExact = Math.max(0, rawExact - diff.errors / elapsedMinutes);

  return {
    wpm: Math.round(netExact),
    rawWpm: Math.round(rawExact),
    accuracy: diff.typedChars
      ? Math.max(0, Math.min(100, (diff.correctChars / diff.typedChars) * 100))
      : 0,
    errors: diff.errors,
    correctChars: diff.correctChars,
    typedChars: diff.typedChars,
  };
}
