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
  correctChars: number;
  typedChars: number;
}
const LOOKAHEAD = 3;
export function diffWords(typed: string, target: string): TypingDiff {
  const endsWithSpace = /\s$/.test(typed);
  const allTypedWords = typed.trim().length ? typed.trim().split(/\s+/) : [];
  let partial = "";
  if (!endsWithSpace && allTypedWords.length > 0) {
    partial = allTypedWords.pop() as string;
  }
  const targetWords = target.trim().length ? target.trim().split(/\s+/) : [];
  const results: WordDiffResult[] = [];
  let ti = 0;
  let gi = 0;
  while (gi < targetWords.length && ti < allTypedWords.length) {
    if (allTypedWords[ti] === targetWords[gi]) {
      results.push({ word: targetWords[gi], status: "correct" });
      ti++;
      gi++;
      continue;
    }
    let skipK = -1;
    for (let k = 1; k <= LOOKAHEAD && gi + k < targetWords.length; k++) {
      if (allTypedWords[ti] === targetWords[gi + k]) {
        skipK = k;
        break;
      }
    }
    if (skipK > 0) {
      for (let j = 0; j < skipK; j++) results.push({ word: targetWords[gi + j], status: "skipped" });
      gi += skipK;
      continue;
    }
    let extraK = -1;
    for (let k = 1; k <= LOOKAHEAD && ti + k < allTypedWords.length; k++) {
      if (allTypedWords[ti + k] === targetWords[gi]) {
        extraK = k;
        break;
      }
    }
    if (extraK > 0) {
      ti += extraK;
      continue;
    }
    results.push({ word: targetWords[gi], status: "wrong" });
    ti++;
    gi++;
  }
  for (; gi < targetWords.length; gi++) {
    results.push({ word: targetWords[gi], status: "pending" });
  }
  const correctWords = results.filter((r) => r.status === "correct").length;
  const wrongWords = results.filter((r) => r.status === "wrong").length;
  const skippedWords = results.filter((r) => r.status === "skipped").length;
  let correctChars = results
    .filter((r) => r.status === "correct")
    .reduce((sum, r) => sum + r.word.length + 1, 0);
  const nextPending = results.find((r) => r.status === "pending");
  if (partial && nextPending && nextPending.word.startsWith(partial)) {
    correctChars += partial.length;
  }
  return {
    results,
    correctWords,
    wrongWords,
    skippedWords,
    correctChars,
    typedChars: typed.length,
  };
}
