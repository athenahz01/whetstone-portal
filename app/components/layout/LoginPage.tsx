"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", background: "#fff",
    border: "1px solid #cbd5e1", borderRadius: 10, color: "#0f172a",
    fontSize: 15, outline: "none", boxSizing: "border-box",
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-raised flex flex-col items-center justify-center">
      <div className="bg-white border border-line rounded-2xl p-10" style={{ width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-4 text-2xl text-white font-bold">W</div>
          <h1 className="text-2xl font-bold text-heading m-0">Whetstone</h1>
          <p className="text-sub text-sm m-0 mt-1">Refined Method. Proven Results.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-body mb-1.5">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@email.com"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-body mb-1.5">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg text-base font-semibold cursor-pointer border-none text-white mt-2"
            style={{ background: loading ? "#94a3b8" : "#3b82f6" }}
          >
            {loading ? "Please wait..." : "Log In"}
          </button>

          <p className="text-xs text-center m-0 mt-1" style={{ color: "#94a3b8" }}>
            Don&apos;t have an account? Contact your strategist or admin.
          </p>
        </div>
      </div>
    </div>
  );
}