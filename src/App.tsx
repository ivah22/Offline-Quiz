import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ensureAdminSeeded, useSession } from "@/lib/auth";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import AdminPage from "@/pages/AdminPage";
import HistoryPage from "@/pages/HistoryPage";
import TrashPage from "@/pages/TrashPage";
import SettingsPage from "@/pages/SettingsPage";
import QuizPage from "@/pages/QuizPage";
import ResultsPage from "@/pages/ResultsPage";
import NotFoundPage from "@/pages/NotFoundPage";

function AuthGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { session, ready } = useSession();

  useEffect(() => { ensureAdminSeeded(); }, []);

  useEffect(() => {
    if (!ready) return;
    if (!session && pathname !== "/login") {
      navigate("/login");
    }
  }, [ready, session, pathname, navigate]);

  if (!ready) return null;
  if (!session && pathname !== "/login") return null;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/trash" element={<TrashPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/quiz/:id" element={<QuizPage />} />
        <Route path="/results/:attemptId" element={<ResultsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthGate>
  );
}
