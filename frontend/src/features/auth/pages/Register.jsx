import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/auth-context";

import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import Card from "../../../shared/ui/Card";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(username, email, password);

      // אחרי הרשמה - מעבירים ללוגין (כמו מוצר אמיתי)
      navigate("/login");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6">
      <Card className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-wide">
              <span className="text-red-600">Cyber</span>Range
            </h1>

            <p className="mt-2 text-sm text-zinc-400">
              Create your account and start learning cybersecurity.
            </p>
          </div>

          {/* Inputs */}

          <Input
            label="Username"
            type="text"
            placeholder="cyber_ninja"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Register"}
          </Button>

          {/* Switch to login */}
          <p className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-red-500 hover:text-red-400"
            >
              Login
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}
