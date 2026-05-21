import * as XLSX from "xlsx";
import type { Question } from "./db";

export async function parseExcelFile(file: File): Promise<Question[]> {
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

  // detect header
  let start = 0;
  const first = rows[0].map((c) => String(c).toLowerCase().trim());
  if (first[0]?.includes("question") || first[5]?.includes("answer")) start = 1;

  const questions: Question[] = [];
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
    // Accept correct as literal text OR letter A/B/C/D
    let correctText = correct;
    const letter = correct.toUpperCase();
    if (["A", "B", "C", "D"].includes(letter)) {
      correctText = choices["ABCD".indexOf(letter)];
    }
    if (!choices.includes(correctText)) {
      throw new Error(
        `Row ${i + 1}: correct answer "${correct}" doesn't match any choice`,
      );
    }
    questions.push({ question: q, choices, correct: correctText });
  }

  if (!questions.length) throw new Error("No valid questions found");
  return questions;
}
