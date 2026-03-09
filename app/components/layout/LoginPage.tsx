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
    width: "100%", padding: "11px 14px", background: "#222",
    border: "1px solid #303030", borderRadius: 8, color: "#e0e0e0",
    fontSize: 14, outline: "none", boxSizing: "border-box",
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
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: "#111", position: "relative", overflow: "hidden" }}>
      {/* Subtle ambient glow */}
      <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(108,140,255,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      
      <div className="relative rounded-2xl p-10" style={{ width: 400, background: "#1c1c1c", border: "1px solid #262626" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-4 text-lg font-semibold" style={{ background: "#f0f0f0", color: "#141414" }}>W</div>
          <h1 className="text-3xl text-heading m-0" style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400 }}>Whetstone</h1>
          <p className="text-sm m-0 mt-2" style={{ color: "#666" }}>Refined Method. Proven Results.</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</label>
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
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Password</label>
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
            style={{ background: loading ? "#444" : "#6c8cff" }}
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