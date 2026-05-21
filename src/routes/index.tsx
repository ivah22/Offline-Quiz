import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { parseExcelFile } from "@/lib/excel";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quizzes = useLiveQuery(
    () => db.quizzes.orderBy("createdAt").reverse().toArray(),
    [],
  );

  async function handleFile(file: File) {
    setError(null);
    if (!/\.xlsx$/i.test(file.name)) {
      setError("Please upload a .xlsx file");
      return;
    }
    setBusy(true);
    try {
      const questions = await parseExcelFile(file);
      const id = await db.quizzes.add({
        title: file.name.replace(/\.xlsx$/i, ""),
        questions,
        fileData: file,
        createdAt: Date.now(),
      });
      navigate({ to: "/quiz/$id", params: { id: String(id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse Excel");
    } finally {
      setBusy(false);
    }
  }

  async function deleteQuiz(id: number) {
    if (!confirm("Delete this quiz and its attempts?")) return;
    await db.transaction("rw", db.quizzes, db.attempts, async () => {
      await db.quizzes.delete(id);
      await db.attempts.where("quizId").equals(id).delete();
    });
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary shadow-soft">
            <span className="text-lg">✓</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">Quiz Vault</h1>
            <p className="text-xs text-muted-foreground">Offline · Personal</p>
          </div>
        </div>
        <button
          onClick={toggle}
          className="rounded-full border bg-card p-2.5 text-sm shadow-card transition hover:scale-105"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-8">
        <section
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-3xl border-2 border-dashed bg-card p-10 text-center shadow-card transition ${
            dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/60"
          }`}
        >
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-primary text-2xl text-primary-foreground shadow-soft">
            ⬆
          </div>
          <h2 className="text-lg font-semibold">
            {busy ? "Parsing..." : "Drop .xlsx file or tap to browse"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Columns: A Question · B–E Choices · F Correct Answer
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          {error && (
            <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Your Quizzes
            </h3>
            <span className="text-xs text-muted-foreground">
              {quizzes?.length ?? 0} saved
            </span>
          </div>

          {quizzes && quizzes.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              No quizzes yet. Upload an Excel file to get started.
            </div>
          )}

          <ul className="space-y-3">
            {quizzes?.map((q) => (
              <li
                key={q.id}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card transition hover:shadow-soft"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground font-bold">
                  {q.questions.length}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{q.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(q.createdAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  to="/quiz/$id"
                  params={{ id: String(q.id) }}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft active:scale-95"
                >
                  Start
                </Link>
                <button
                  onClick={() => deleteQuiz(q.id!)}
                  className="rounded-xl border px-3 py-2 text-sm text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <PWAHint />
      </main>
    </div>
  );
}

function PWAHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(!window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  if (!show) return null;
  return (
    <div className="mt-10 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
      <strong className="text-foreground">Install on Android:</strong> open this
      site in Chrome → menu (⋮) → <em>Add to Home screen</em>. Once installed it
      works fully offline.
    </div>
  );
}
