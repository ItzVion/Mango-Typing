export type LessonKind = "keys" | "words";

export interface Lesson {
  id: number;
  title: string;
  category: string;
  kind: LessonKind;
  // For "keys" lessons: the character pool to drill (finger-placement practice).
  // For "words" lessons: a word bank to sample from.
  pool: string[];
  length: number; // roughly how many groups/words to generate per attempt
}

const homeRow = ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"];
const upperRow = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const lowerRow = ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"];

const commonWords1 = ["the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out", "day", "get"];
const commonWords2 = ["work", "time", "just", "know", "take", "into", "year", "your", "good", "some", "them", "well", "make", "over", "such", "here"];

export const LESSONS: Lesson[] = [
  { id: 1, title: "Home Row 1", category: "Home Row", kind: "keys", pool: ["a", "s", "d", "f"], length: 16 },
  { id: 2, title: "Home Row 2", category: "Home Row", kind: "keys", pool: ["g", "h", "j", "k"], length: 16 },
  { id: 3, title: "Home Row 3", category: "Home Row", kind: "keys", pool: homeRow, length: 20 },
  { id: 4, title: "Upper Row 1", category: "Upper Row", kind: "keys", pool: ["q", "w", "e", "r"], length: 16 },
  { id: 5, title: "Upper Row 2", category: "Upper Row", kind: "keys", pool: ["t", "y", "u", "i"], length: 16 },
  { id: 6, title: "Upper Row 3", category: "Upper Row", kind: "keys", pool: upperRow, length: 20 },
  { id: 7, title: "Home + Upper 1", category: "Combination", kind: "keys", pool: [...homeRow.slice(0, 5), ...upperRow.slice(0, 5)], length: 20 },
  { id: 8, title: "Home + Upper 2", category: "Combination", kind: "keys", pool: [...homeRow, ...upperRow], length: 22 },
  { id: 9, title: "Home + Lower 1", category: "Combination", kind: "keys", pool: [...homeRow.slice(0, 5), ...lowerRow.slice(0, 5)], length: 20 },
  { id: 10, title: "Home + Lower 2", category: "Combination", kind: "keys", pool: [...homeRow, ...lowerRow], length: 22 },
  { id: 11, title: "All Row Practice 1", category: "All Row", kind: "keys", pool: [...homeRow, ...upperRow, ...lowerRow], length: 24 },
  { id: 12, title: "All Row Practice 2", category: "All Row", kind: "keys", pool: [...homeRow, ...upperRow, ...lowerRow], length: 26 },
  { id: 13, title: "Common Words 1", category: "Words", kind: "words", pool: commonWords1, length: 24 },
  { id: 14, title: "Common Words 2", category: "Words", kind: "words", pool: commonWords2, length: 24 },
  { id: 15, title: "Pangram Practice", category: "Pangram", kind: "words", pool: "the quick brown fox jumps over a lazy dog while five boxing wizards jump quickly".split(" "), length: 30 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Builds a fresh practice string each time a lesson loads — original content,
// generated from the lesson's key/word pool rather than copied from anywhere.
export function generateLessonText(lesson: Lesson): string {
  if (lesson.kind === "words") {
    return Array.from({ length: lesson.length }, () => pick(lesson.pool)).join(" ");
  }
  // "keys" lessons: group characters into pseudo-words of 3-5 for rhythm practice.
  const groups: string[] = [];
  for (let i = 0; i < lesson.length; i++) {
    const groupLen = 3 + Math.floor(Math.random() * 3);
    groups.push(Array.from({ length: groupLen }, () => pick(lesson.pool)).join(""));
  }
  return groups.join(" ");
}
