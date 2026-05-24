import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Trash2, UserPlus, Shield } from "lucide-react";
import { db } from "@/lib/db";
import { createUser, deleteUser, useSession } from "@/lib/auth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const users = useLiveQuery(() => db.users.orderBy("createdAt").toArray(), []);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (ready && (!session || session.role !== "admin")) navigate("/");
  }, [ready, session, navigate]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);
    setBusy(true);
    try {
      await createUser({ fullName, username, password });
      setOk(`User "${fullName}" created`);
      setFullName(""); setUsername(""); setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-16">
      <header className="mx-auto max-w-2xl px-5 pt-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold">
          <Shield className="size-6 text-primary" /> Admin Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Create and manage user accounts.</p>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-5 pt-6">
        <form onSubmit={onCreate} className="space-y-3 rounded-2xl border bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Create new user</p>
          <Field label="Full name" value={fullName} onChange={setFullName} required />
          <Field label="Username" value={username} onChange={setUsername} required />
          <Field label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
          {ok && <p className="rounded-xl bg-success/10 px-3 py-2 text-xs text-success">{ok}</p>}
          <button type="submit" disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft active:scale-[0.98] disabled:opacity-60">
            <UserPlus className="size-4" /> {busy ? "Creating..." : "Create user"}
          </button>
        </form>

        <section>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accounts ({users?.length ?? 0})</h3>
          <ul className="space-y-2">
            {users?.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-card">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-bold ${u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                  {u.fullName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">@{u.username} · {u.role}</p>
                </div>
                {u.role !== "admin" && (
                  <button onClick={() => u.id && setConfirm({ id: u.id, name: u.fullName })}
                    className="rounded-xl border p-2 text-destructive hover:bg-destructive/10" aria-label="Delete">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
          The admin can change their own password from Settings. User passwords cannot be changed once created — delete and recreate the account instead.
        </p>
      </main>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{confirm?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The account will be permanently removed. Quizzes and attempts already created by this user will remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (confirm) await deleteUser(confirm.id);
              setConfirm(null);
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
