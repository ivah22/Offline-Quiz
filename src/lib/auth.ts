import { useEffect, useState } from "react";
import { db, type User } from "./db";

export interface Session {
  userId: number;
  username: string;
  fullName: string;
  role: "admin" | "user";
}

const KEY = "quiz-session-v1";

type Listener = (s: Session | null) => void;
const listeners = new Set<Listener>();
let current: Session | null = null;

function read(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(s: Session | null) {
  current = s;
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  listeners.forEach((l) => l(s));
}

export function getSession(): Session | null {
  return current;
}

async function randomSalt(): Promise<string> {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100_000, hash: "SHA-256" },
    key, 256,
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function ensureAdminSeeded() {
  const admin = await db.users.where("role").equals("admin").first();
  if (admin) return;
  const salt = await randomSalt();
  const passwordHash = await hashPassword("admin", salt);
  await db.users.add({
    username: "admin",
    fullName: "Administrator",
    role: "admin",
    salt,
    passwordHash,
    createdAt: Date.now(),
  });
}

export async function login(username: string, password: string): Promise<Session> {
  const u = await db.users.where("username").equalsIgnoreCase(username.trim()).first();
  if (!u) throw new Error("Invalid username or password");
  const hash = await hashPassword(password, u.salt);
  if (hash !== u.passwordHash) throw new Error("Invalid username or password");
  const session: Session = {
    userId: u.id!,
    username: u.username,
    fullName: u.fullName,
    role: u.role,
  };
  write(session);
  return session;
}

export function logout() {
  write(null);
}

export async function createUser(input: { fullName: string; username: string; password: string }) {
  const username = input.username.trim().toLowerCase();
  if (!username || !input.fullName.trim() || !input.password) {
    throw new Error("All fields are required");
  }
  if (input.password.length < 4) throw new Error("Password must be at least 4 characters");
  const existing = await db.users.where("username").equalsIgnoreCase(username).first();
  if (existing) throw new Error("Username already taken");
  const salt = await randomSalt();
  const passwordHash = await hashPassword(input.password, salt);
  return db.users.add({
    username,
    fullName: input.fullName.trim(),
    role: "user",
    salt,
    passwordHash,
    createdAt: Date.now(),
  });
}

export async function deleteUser(id: number) {
  const u = await db.users.get(id);
  if (!u) return;
  if (u.role === "admin") throw new Error("Cannot delete the admin account");
  await db.users.delete(id);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const s = getSession();
  if (!s || s.role !== "admin") throw new Error("Not authorized");
  if (newPassword.length < 4) throw new Error("New password must be at least 4 characters");
  const u = await db.users.get(s.userId);
  if (!u) throw new Error("Admin not found");
  const hash = await hashPassword(currentPassword, u.salt);
  if (hash !== u.passwordHash) throw new Error("Current password is incorrect");
  const salt = await randomSalt();
  const passwordHash = await hashPassword(newPassword, salt);
  await db.users.update(u.id!, { salt, passwordHash });
}

export function useSession() {
  const [s, setS] = useState<Session | null>(current);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    current = read();
    setS(current);
    setReady(true);
    const l: Listener = (next) => setS(next);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  return { session: s, ready };
}
