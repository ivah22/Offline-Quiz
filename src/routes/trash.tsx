import { createFileRoute, Link } from "@tanstack/react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { db, type Quiz } from "@/lib/db";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/trash")({ component: TrashPage });

function TrashPage() {
  const [confirm, setConfirm] = useState<Quiz | null>(null);
  const trashed = useLiveQuery(
    async () => (await db.quizzes.toArray()).filter((q) => q.deletedAt),
    [],
  );

  async function restore(id: number) {
    await db.quizzes.update(id, { deletedAt: null });
  }

  async function purge(id: number) {
    await db.transaction("rw", db.quizzes, db.attempts, async () => {
      await db.quizzes.delete(id);
      await db.attempts.where("quizId").equals(id).delete();
    });
    setConfirm(null);
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <h1 className="mt-4 text-2xl font-bold">Trash</h1>
        <p className="text-sm text-muted-foreground">Restore quizzes or delete them permanently.</p>
      </header>

      <main className="mx-auto max-w-2xl px-5 pt-6">
        <ul className="space-y-3">
          {trashed?.length === 0 && (
            <li className="rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
              Trash is empty.
            </li>
          )}
          {trashed?.map((q) => (
            <li key={q.id} className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-card">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted font-bold">
                {q.questions.length}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{q.title}</p>
                <p className="text-xs text-muted-foreground">
                  Deleted {q.deletedAt ? new Date(q.deletedAt).toLocaleDateString() : ""}
                </p>
              </div>
              <button onClick={() => q.id && restore(q.id)}
                className="inline-flex items-center gap-1 rounded-xl border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent">
                <RotateCcw className="size-3" /> Restore
              </button>
              <button onClick={() => setConfirm(q)}
                className="rounded-xl border px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                <Trash2 className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirm?.title}" forever?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the quiz and all of its attempts. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm?.id && purge(confirm.id)}>
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
