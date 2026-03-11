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
    width: "100%", padding: "12px 16px", background: "#252525",
    border: "1px solid #333", borderRadius: 10, color: "#ebebeb",
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
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#111" }}>
      <div className="border border-line rounded-2xl p-10" style={{ width: 420, background: "#1e1e1e", boxShadow: "0 4px 24px rgba(0,0,0,0.3)" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/whetstone-logo.png" alt="Whetstone" className="mx-auto mb-2" style={{ height: 48, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#a0a0a0" }}>Email</label>
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
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#a0a0a0" }}>Password</label>
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
            <div className="text-sm p-3 rounded-lg" style={{ background: "rgba(229,91,91,0.08)", color: "#e55b5b" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-lg text-base font-semibold cursor-pointer border-none text-white mt-2"
            style={{ background: loading ? "#505050" : "#528bff" }}
          >
            {loading ? "Please wait..." : "Log In"}
          </button>

          <p className="text-xs text-center m-0 mt-1" style={{ color: "#505050" }}>
            Don&apos;t have an account? Contact your strategist or admin.
          </p>
        </div>
      </div>
    </div>
  );
}