import * as XLSX from "xlsx";
import type { Question } from "./db";

export interface ParsedQuiz {
  questions: Question[];
  category?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
}

export async function parseExcelFile(file: File): Promise<ParsedQuiz> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("Excel file has no sheets");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: "",
  });
  if (!rows.length) throw new Error("Excel is empty");

  let start = 0;
  const first = rows[0].map((c) => String(c).toLowerCase().trim());
  if (first[0]?.includes("question") || first[5]?.includes("answer")) start = 1;

  const questions: Question[] = [];
  const categoryCounts: Record<string, number> = {};
  const diffCounts: Record<string, number> = {};

  for (let i = start; i < rows.length; i++) {
    const r = rows[i];
    const q = String(r[0] ?? "").trim();
    const a = String(r[1] ?? "").trim();
    const b = String(r[2] ?? "").trim();
    const c = String(r[3] ?? "").trim();
    const d = String(r[4] ?? "").trim();
    const correct = String(r[5] ?? "").trim();
    if (!q || !a || !b || !c || !d || !correct) continue;

    const choices = [a, b, c, d];
    let correctText = correct;
    const letter = correct.toUpperCase();
    if (["A", "B", "C", "D"].includes(letter)) {
      correctText = choices["ABCD".indexOf(letter)];
    }
    if (!choices.includes(correctText)) {
      throw new Error(`Row ${i + 1}: correct answer "${correct}" doesn't match any choice`);
    }

    const category = String(r[6] ?? "").trim() || undefined;
    const diffRaw = String(r[7] ?? "").trim().toLowerCase();
    let difficulty: "Easy" | "Medium" | "Hard" | undefined;
    if (diffRaw.startsWith("e")) difficulty = "Easy";
    else if (diffRaw.startsWith("h")) difficulty = "Hard";
    else if (diffRaw.startsWith("m")) difficulty = "Medium";
    const pointsRaw = Number(r[8] ?? "");
    const points = Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1;

    if (category) categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    if (difficulty) diffCounts[difficulty] = (diffCounts[difficulty] ?? 0) + 1;

    questions.push({ question: q, choices, correct: correctText, category, difficulty, points });
  }

  if (!questions.length) throw new Error("No valid questions found");

  const topCat = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topDiff = Object.entries(diffCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as
    | "Easy" | "Medium" | "Hard" | undefined;

  return { questions, category: topCat, difficulty: topDiff };
}
