import Dexie, { type Table } from "dexie";

export interface Question {
  question: string;
  choices: string[];
  correct: string;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  points?: number;
}

export interface Quiz {
  id?: number;
  title: string;
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  questions: Question[];
  fileData?: Blob;
  createdAt: number;
  deletedAt?: number | null;
}

export interface Attempt {
  id?: number;
  quizId: number;
  quizTitle: string;
  questionOrder: number[]; // indexes into quiz.questions
  answers: (string | null)[]; // aligned with questionOrder
  score: number;
  total: number;
  points: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  durationSec: number;
  completedAt: number;
}

class QuizDB extends Dexie {
  quizzes!: Table<Quiz, number>;
  attempts!: Table<Attempt, number>;

  constructor() {
    super("QuizDB");
    this.version(1).stores({
      quizzes: "++id, title, createdAt",
      attempts: "++id, quizId, completedAt",
    });
    this.version(2).stores({
      quizzes: "++id, title, category, createdAt, deletedAt",
      attempts: "++id, quizId, completedAt",
    }).upgrade(async (tx) => {
      await tx.table("quizzes").toCollection().modify((q) => {
        if (q.deletedAt === undefined) q.deletedAt = null;
      });
    });
  }
}

export const db = new QuizDB();

export function quizDifficulty(q: Quiz): "Easy" | "Medium" | "Hard" {
  if (q.difficulty) return q.difficulty;
  const counts: Record<string, number> = { Easy: 0, Medium: 0, Hard: 0 };
  q.questions.forEach((qq) => qq.difficulty && counts[qq.difficulty]++);
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return (top?.[1] ?? 0) > 0 ? (top![0] as any) : "Medium";
}

export function quizTotalPoints(q: Quiz): number {
  return q.questions.reduce((s, qq) => s + (qq.points ?? 1), 0);
}

export function quizCategories(q: Quiz): string[] {
  const set = new Set<string>();
  if (q.category) set.add(q.category);
  q.questions.forEach((qq) => qq.category && set.add(qq.category));
  return [...set];
}
