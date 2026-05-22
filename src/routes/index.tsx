import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Upload, Search, Settings as SettingsIcon, History as HistoryIcon,
  Trash2, Sun, Moon, HardDrive, Database, Tag, Play, RotateCcw,
  Shield, LogOut, User as UserIcon,
} from "lucide-react";
import { db, quizTotalPoints, type Quiz } from "@/lib/db";
import { parseExcelFile } from "@/lib/excel";
import { useSettings, toggleTheme } from "@/lib/settings";
import { useSession, logout } from "@/lib/auth";
import { getStorageEstimate, formatBytes } from "@/lib/storage";
import { backupAllQuizzes, restoreFromBackup } from "@/lib/export";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const settings = useSettings();
  const { session } = useSession();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  
  const [confirm, setConfirm] = useState<Quiz | null>(null);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });

  const quizzes = useLiveQuery(
    () => db.quizzes.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const activeQuizzes = useMemo(
    () => (quizzes ?? []).filter((q) => !q.deletedAt),
    [quizzes],
  );
  const trashedCount = useMemo(
    () => (quizzes ?? []).filter((q) => q.deletedAt).length,
    [quizzes],
  );

  useEffect(() => {
    getStorageEstimate().then(setStorage);
  }, [quizzes?.length]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    activeQuizzes.forEach((q) => q.category && s.add(q.category));
    return ["All", ...[...s].sort()];
  }, [activeQuizzes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeQuizzes.filter((quiz) => {
      if (activeCategory !== "All" && quiz.category !== activeCategory) return false;
      
      if (!q) return true;
      return (
        quiz.title.toLowerCase().includes(q) ||
        quiz.category?.toLowerCase().includes(q) ||
        quiz.questions.some((qq) => qq.question.toLowerCase().includes(q))
      );
    });
  }, [activeQuizzes, search, activeCategory]);

  async function handleFile(file: File) {
    setError(null);
    if (!/\.xlsx$/i.test(file.name)) {
      setError("Please upload a .xlsx file");
      return;
    }
    setBusy(true);
    try {
      const { questions, category } = await parseExcelFile(file);
      const base = file.name.replace(/\.xlsx$/i, "");
      const creatorName = session?.fullName ?? "Unknown";
      const id = await db.quizzes.add({
        title: `${base} — Quiz by ${creatorName}`,
        category,
        questions,
        fileData: file,
        createdAt: Date.now(),
        deletedAt: null,
        createdByUserId: session?.userId,
        createdByName: creatorName,
      });
      navigate({ to: "/quiz/$id", params: { id: String(id) } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse Excel");
    } finally {
      setBusy(false);
    }
  }


  async function trashQuiz(id: number) {
    await db.quizzes.update(id, { deletedAt: Date.now() });
    setConfirm(null);
  }

  async function handleRestore(file: File) {
    try {
      await restoreFromBackup(file);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Restore failed");
    }
  }

  const storagePct = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-5 pt-8">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-primary shadow-soft text-primary-foreground font-bold">QV</div>
          <div>
            <h1 className="text-xl font-bold">Quiz Vault</h1>
            <p className="text-xs text-muted-foreground">Offline · Personal</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Link to="/history" className="rounded-full border bg-card p-2.5 shadow-card hover:bg-accent" aria-label="History">
            <HistoryIcon className="size-4" />
          </Link>
          <Link to="/trash" className="relative rounded-full border bg-card p-2.5 shadow-card hover:bg-accent" aria-label="Trash">
            <Trash2 className="size-4" />
            {trashedCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {trashedCount}
              </span>
            )}
          </Link>
          <Link to="/settings" className="rounded-full border bg-card p-2.5 shadow-card hover:bg-accent" aria-label="Settings">
            <SettingsIcon className="size-4" />
          </Link>
          <button onClick={toggleTheme} className="rounded-full border bg-card p-2.5 shadow-card hover:bg-accent" aria-label="Toggle theme">
            {settings.theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-8">
        <section
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className={`group cursor-pointer rounded-3xl border-2 border-dashed bg-card p-8 text-center shadow-card transition ${
            dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/60"
          }`}
        >
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
            <Upload className="size-6" />
          </div>
          <h2 className="text-base font-semibold">{busy ? "Parsing..." : "Drop .xlsx or tap to browse"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">A–F required · G Category · H Points (optional)</p>
          <input ref={inputRef} type="file" accept=".xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          {error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Database className="size-3.5" /> Quizzes saved
            </div>
            <p className="mt-1 text-2xl font-bold">{activeQuizzes.length}</p>
          </div>
          <div className="rounded-2xl border bg-card p-4 shadow-card">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <HardDrive className="size-3.5" /> Local storage
            </div>
            <p className="mt-1 text-2xl font-bold">{formatBytes(storage.usage)}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary" style={{ width: `${storagePct}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">of {formatBytes(storage.quota)}</p>
          </div>
        </section>

        <section className="mt-6 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quizzes or questions..."
              className="w-full rounded-2xl border bg-card py-3 pl-10 pr-3 text-sm shadow-card outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setActiveCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  activeCategory === c ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent"
                }`}>
                {c === "All" ? "All categories" : <span className="inline-flex items-center gap-1"><Tag className="size-3" />{c}</span>}
              </button>
            ))}
          </div>

        </section>

        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Your Quizzes</h3>
            <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
          </div>

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              {activeQuizzes.length === 0 ? "No quizzes yet. Upload an Excel file to get started." : "No quizzes match your filters."}
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map((q) => {
              const pts = quizTotalPoints(q);
              return (
                <li key={q.id} className="rounded-2xl border bg-card p-4 shadow-card transition hover:shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground font-bold">
                      {q.questions.length}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{q.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {q.category && <span className="rounded-full bg-muted px-2 py-0.5">{q.category}</span>}
                        <span className="text-muted-foreground">{pts} pts</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Link to="/quiz/$id" params={{ id: String(q.id) }}
                        className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-soft active:scale-95">
                        <Play className="size-3" /> Start
                      </Link>
                      <button onClick={() => setConfirm(q)}
                        className="inline-flex items-center justify-center rounded-xl border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                        aria-label="Delete">
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8 grid grid-cols-2 gap-3">
          <button onClick={backupAllQuizzes}
            className="rounded-2xl border bg-card p-4 text-left shadow-card hover:bg-accent">
            <p className="text-sm font-semibold">Backup all</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Download JSON of every quiz and attempt.</p>
          </button>
          <button onClick={() => restoreRef.current?.click()}
            className="rounded-2xl border bg-card p-4 text-left shadow-card hover:bg-accent">
            <p className="inline-flex items-center gap-1 text-sm font-semibold"><RotateCcw className="size-3.5" /> Restore</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Import a previously saved backup file.</p>
          </button>
          <input ref={restoreRef} type="file" accept=".json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRestore(f); e.target.value = ""; }} />
        </section>

        <PWAHint />
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move "{confirm?.title}" to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              The quiz and its attempts will be hidden. You can restore it from the trash bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm?.id && trashQuiz(confirm.id)}>
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <div className="mt-8 rounded-2xl border bg-muted/40 p-4 text-xs text-muted-foreground">
      <strong className="text-foreground">Install on Android:</strong> open in Chrome → menu (⋮) → <em>Add to Home screen</em>.
    </div>
  );
}
