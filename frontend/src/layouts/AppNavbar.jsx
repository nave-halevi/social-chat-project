import { NavLink } from "react-router-dom";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { deleteLab, getAnyActiveLab } from "../features/labs/services/labService";

export default function AppNavbar() {
  const { user } = useAuth();
  const [activeLab, setActiveLab] = useState(null);
  const [now, setNow] = useState(0);
  const [isStopping, setIsStopping] = useState(false);

  const linkClass = ({ isActive }) =>
    isActive
      ? "text-white font-medium"
      : "text-zinc-400 hover:text-white transition";

  const profileInitial = (user?.user_name || user?.email || "U")
    .charAt(0)
    .toUpperCase();

  const expiresAtMs = activeLab?.expires_at
    ? new Date(activeLab.expires_at).getTime()
    : null;
  const remainingMs = expiresAtMs ? expiresAtMs - now : null;
  const totalSeconds = remainingMs && remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
  const remainingLabel =
    remainingMs === null
      ? ""
      : remainingMs <= 0
        ? "expiring"
        : `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    let cancelled = false;

    const loadActiveLab = async () => {
      if (!localStorage.getItem("token")) {
        setActiveLab(null);
        return;
      }

      try {
        const lab = await getAnyActiveLab();
        if (!cancelled) setActiveLab(lab);
      } catch {
        if (!cancelled) setActiveLab(null);
      }
    };

    setNow(Date.now());
    loadActiveLab();
    const refresh = window.setInterval(loadActiveLab, 60_000);
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);

    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      window.clearInterval(timer);
    };
  }, [user?.id]);

  useEffect(() => {
    if (remainingMs !== null && remainingMs <= 0) {
      setActiveLab(null);
      getAnyActiveLab()
        .then((lab) => {
          if (lab?.expires_at && new Date(lab.expires_at).getTime() > Date.now()) {
            setActiveLab(lab);
          }
        })
        .catch(() => setActiveLab(null));
    }
  }, [remainingMs]);

  const stopActiveLab = async () => {
    if (!activeLab?.environment_id) return;
    setIsStopping(true);
    try {
      await deleteLab(activeLab.environment_id);
      setActiveLab(null);
    } finally {
      setIsStopping(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
        {/* Left - Logo + Nav */}
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold">
            <span className="text-red-600">Cyber</span>Range
          </h1>

          <nav className="flex gap-6 text-sm">
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>

            <NavLink to="/academy" className={linkClass}>
              Academy
            </NavLink>

            <NavLink to="/machines" className={linkClass}>
              Machines
            </NavLink>

            <NavLink to="/leaderboard" className={linkClass}>
              Leaderboard
            </NavLink>
          </nav>
        </div>

        {/* Right - User section */}
        <div className="flex items-center gap-4 text-sm">
          {activeLab?.environment_status && (
            <div
              className={`hidden items-center gap-2 rounded-lg border px-3 py-1.5 md:flex ${
                remainingMs !== null && remainingMs <= 120_000
                  ? "border-red-500/50 text-red-300"
                  : "border-emerald-500/40 text-emerald-300"
              }`}
            >
              <span>Lab Running</span>
              <span className="font-mono text-xs">{remainingLabel}</span>
              <button
                onClick={stopActiveLab}
                disabled={isStopping}
                className="text-xs text-zinc-300 hover:text-white disabled:opacity-50"
              >
                {isStopping ? "Stopping..." : "Stop Lab"}
              </button>
            </div>
          )}

          <NavLink
            to="/profile"
            aria-label="Open profile"
            className="flex items-center gap-3 text-zinc-400 transition hover:text-white"
          >
            <span className="hidden sm:inline">{user?.email || "Profile"}</span>

            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                profileInitial
              )}
            </span>
          </NavLink>

          {user?.role?.toLowerCase() === "admin" && (
            <NavLink
              to="/admin"
              className="text-red-400 hover:text-red-300 transition"
            >
              Admin
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
