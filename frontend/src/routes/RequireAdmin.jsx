import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function RequireAdmin() {
  const { user } = useAuth();
  let storedUser;

  try {
    storedUser = JSON.parse(localStorage.getItem("user"));
  } catch {
    storedUser = null;
  }

  const currentUser = user || storedUser;

  if (currentUser?.role?.toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
