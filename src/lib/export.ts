import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { db, type Attempt, type Quiz } from "./db";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function exportResultsToExcel(attempt: Attempt, quiz: Quiz) {
  const rows = attempt.questionOrder.map((qi, i) => {
    const q = quiz.questions[qi];
    const given = attempt.answers[i] ?? "";
    return {
      "#": i + 1,
      Question: q.question,
      "Your Answer": given,
      "Correct Answer": q.correct,
      Result: given === q.correct ? "Correct" : "Incorrect",
      Points: given === q.correct ? (q.points ?? 1) : 0,
    };
  });
  const wb = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["Quiz", attempt.quizTitle],
    ["Score", `${attempt.score} / ${attempt.total}`],
    ["Points", `${attempt.points} / ${attempt.maxPoints}`],
    ["Percentage", `${attempt.percentage}%`],
    ["Passed", attempt.passed ? "Yes" : "No"],
    ["Duration", `${attempt.durationSec}s`],
    ["Date", new Date(attempt.completedAt).toLocaleString()],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");
  const detail = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, detail, "Answers");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  download(new Blob([buf], { type: "application/octet-stream" }), `${attempt.quizTitle}-results.xlsx`);
}

export function exportResultsToPDF(attempt: Attempt, quiz: Quiz) {
  const doc = new jsPDF();
  const margin = 14;
  let y = 20;
  doc.setFontSize(18);
  doc.text(attempt.quizTitle, margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(`Score: ${attempt.score}/${attempt.total}  (${attempt.percentage}%)`, margin, y); y += 6;
  doc.text(`Points: ${attempt.points}/${attempt.maxPoints}`, margin, y); y += 6;
  doc.text(`Result: ${attempt.passed ? "PASSED" : "FAILED"}`, margin, y); y += 6;
  doc.text(`Date: ${new Date(attempt.completedAt).toLocaleString()}`, margin, y); y += 10;

  doc.setFontSize(13);
  doc.text("Answer Review", margin, y); y += 8;
  doc.setFontSize(10);

  attempt.questionOrder.forEach((qi, i) => {
    const q = quiz.questions[qi];
    const given = attempt.answers[i] ?? "—";
    const correct = given === q.correct;
    const lines = doc.splitTextToSize(`Q${i + 1}. ${q.question}`, 180);
    if (y + lines.length * 5 + 16 > 280) { doc.addPage(); y = 20; }
    doc.setTextColor(0);
    doc.text(lines, margin, y); y += lines.length * 5 + 1;
    doc.setTextColor(correct ? 30 : 200, correct ? 130 : 30, 30);
    doc.text(`Your answer: ${given}  ${correct ? "✓" : "✗"}`, margin + 4, y); y += 5;
    if (!correct) {
      doc.setTextColor(30, 130, 30);
      doc.text(`Correct: ${q.correct}`, margin + 4, y); y += 5;
    }
    doc.setTextColor(0);
    y += 3;
  });

  doc.save(`${attempt.quizTitle}-results.pdf`);
}

export function printResults() {
  window.print();
}

export async function backupAllQuizzes() {
  const quizzes = await db.quizzes.toArray();
  const attempts = await db.attempts.toArray();
  const payload = {
    version: 2,
    exportedAt: Date.now(),
    quizzes: quizzes.map((q) => ({ ...q, fileData: undefined })),
    attempts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  download(blob, `quizvault-backup-${new Date().toISOString().slice(0, 10)}.json`);
}

export async function restoreFromBackup(file: File) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data.quizzes)) throw new Error("Invalid backup file");
  await db.transaction("rw", db.quizzes, db.attempts, async () => {
    for (const q of data.quizzes) {
      const { id: _id, ...rest } = q;
      await db.quizzes.add(rest);
    }
    if (Array.isArray(data.attempts)) {
      for (const a of data.attempts) {
        const { id: _id, ...rest } = a;
        await db.attempts.add(rest);
      }
    }
  });
}
