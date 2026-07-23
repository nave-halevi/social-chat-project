import { useCallback, useState } from "react";
import {
  login as loginRequest,
  register as registerRequest,
} from "../features/auth/services/authService";
import { AuthContext } from "./auth-context";

function readStoredSession() {
  const token = localStorage.getItem("token");

  try {
    const user = JSON.parse(localStorage.getItem("user"));

    return user && token ? { user, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(readStoredSession);
  const [user, setUser] = useState(initialSession.user);
  const [token, setToken] = useState(initialSession.token);

  const login = async (email, password) => {
    const data = await loginRequest(email, password);

    setUser(data.user);
    setToken(data.token);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };
  const register = async (user_name, email, password) => {
    const data = await registerRequest(user_name, email, password);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const updateStoredUser = useCallback((updatedUser) => {
    setUser((currentUser) => {
      const nextUser = {
        ...(currentUser || {}),
        ...updatedUser,
      };

      localStorage.setItem("user", JSON.stringify(nextUser));

      return nextUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        updateStoredUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
