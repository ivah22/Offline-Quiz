import Dexie, { type Table } from "dexie";

export interface Question {
  question: string;
  choices: string[];
  correct: string;
  category?: string;
  points?: number;
}

export interface Quiz {
  id?: number;
  title: string;
  category?: string;
  questions: Question[];
  fileData?: Blob;
  createdAt: number;
  deletedAt?: number | null;
  createdByUserId?: number;
  createdByName?: string;
}

export interface Attempt {
  id?: number;
  quizId: number;
  quizTitle: string;
  questionOrder: number[];
  answers: (string | null)[];
  score: number;
  total: number;
  points: number;
  maxPoints: number;
  percentage: number;
  passed: boolean;
  durationSec: number;
  completedAt: number;
  takenByUserId?: number;
  takenByName?: string;
}

export interface User {
  id?: number;
  username: string;
  fullName: string;
  role: "admin" | "user";
  passwordHash: string;
  salt: string;
  createdAt: number;
}

class QuizDB extends Dexie {
  quizzes!: Table<Quiz, number>;
  attempts!: Table<Attempt, number>;
  users!: Table<User, number>;

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
    this.version(3).stores({
      quizzes: "++id, title, category, createdAt, deletedAt, createdByUserId",
      attempts: "++id, quizId, completedAt, takenByUserId",
      users: "++id, &username, role, createdAt",
    });
  }
}

export const db = new QuizDB();

export function quizTotalPoints(q: Quiz): number {
  return q.questions.reduce((s, qq) => s + (qq.points ?? 1), 0);
}

export function quizCategories(q: Quiz): string[] {
  const set = new Set<string>();
  if (q.category) set.add(q.category);
  q.questions.forEach((qq) => qq.category && set.add(qq.category));
  return [...set];
}
