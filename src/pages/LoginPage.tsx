import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogIn, Lock, User as UserIcon } from "lucide-react";
import { ensureAdminSeeded, login, useSession } from "@/lib/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { session, ready } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { ensureAdminSeeded(); }, []);
  useEffect(() => {
    if (ready && session) navigate("/");
  }, [ready, session, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center px-4 py-8">
      <div className="w-full max-w-sm relative z-10">
        <form onSubmit={onSubmit} className="space-y-5 rounded-[2rem] border border-primary/20 bg-card p-8 shadow-[0_0_40px_-10px_rgba(0,243,255,0.15)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle inner top glow */}
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
          
          <div className="mb-8 text-center">
            <img src="/logo.png" alt="Quiz Vault Logo" className="mx-auto h-20 w-20 rounded-2xl object-cover shadow-[0_0_20px_rgba(0,243,255,0.4)] ring-1 ring-primary/50" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight drop-shadow-sm text-foreground">Quiz Vault</h1>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Username</span>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                required
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Password</span>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
                required
              />
            </div>
          </label>

          {error && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
          )}

          <button type="submit" disabled={busy}
            className="animate-neon-pulse mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3.5 text-sm font-bold tracking-wide text-primary-foreground shadow-soft active:scale-[0.98] disabled:opacity-60 transition-transform">
            <LogIn className="size-4" /> {busy ? "Authenticating..." : "ENTER VAULT"}
          </button>
        </form>
      </div>
    </div>
  );
}
