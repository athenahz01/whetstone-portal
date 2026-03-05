"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"student" | "parent" | "strategist">("student");
  const [childEmail, setChildEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

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

  const handleSignup = async () => {
    setError("");

    if (role === "parent" && !childEmail.trim()) {
      setError("Please enter your child's email so we can link your account.");
      return;
    }

    setLoading(true);

    const metadata: Record<string, string> = {
      role,
      display_name: name,
    };

    if (role === "parent") {
      metadata.child_email = childEmail.trim();
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.user) {
      onLogin();
    }
  };

  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-raised flex flex-col items-center justify-center">
        <div className="bg-white border border-line rounded-2xl p-10 text-center" style={{ maxWidth: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-5 text-2xl text-white font-bold">W</div>
          <h2 className="text-xl font-bold text-heading mb-2">Check your email!</h2>
          <p className="text-sub text-sm leading-relaxed mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and log in.
          </p>
          <button
            onClick={() => { setMode("login"); setSignupSuccess(false); }}
            className="px-6 py-3 rounded-lg text-sm font-semibold cursor-pointer bg-accent text-white border-none hover:opacity-90"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-raised flex flex-col items-center justify-center">
      <div className="bg-white border border-line rounded-2xl p-10" style={{ width: 420, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-navy flex items-center justify-center mx-auto mb-4 text-2xl text-white font-bold">W</div>
          <h1 className="text-2xl font-bold text-heading m-0">Whetstone</h1>
          <p className="text-sub text-sm m-0 mt-1">Refined Method. Proven Results.</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-mist rounded-lg p-1">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2.5 rounded-md border-none cursor-pointer text-sm font-semibold capitalize"
              style={{
                background: mode === m ? "#fff" : "transparent",
                color: mode === m ? "#0f172a" : "#64748b",
                boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {m === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="flex flex-col gap-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="block text-sm font-semibold text-body mb-1.5">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-body mb-1.5">I am a...</label>
                <div className="flex gap-2">
                  {(["student", "parent", "strategist"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRole(r); setError(""); }}
                      className="flex-1 py-2.5 rounded-lg cursor-pointer text-sm font-semibold capitalize border"
                      style={{
                        background: role === r ? "#eff6ff" : "#fff",
                        borderColor: role === r ? "#3b82f6" : "#cbd5e1",
                        color: role === r ? "#1d4ed8" : "#64748b",
                      }}
                    >
                      {r === "strategist" ? "Counselor" : r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent-specific: Child's email */}
              {role === "parent" && (
                <div
                  className="p-4 rounded-xl"
                  style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
                >
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: "#1d4ed8" }}>
                    Your child&apos;s school email
                  </label>
                  <input
                    value={childEmail}
                    onChange={(e) => setChildEmail(e.target.value)}
                    type="email"
                    placeholder="child@email.com"
                    style={inputStyle}
                  />
                  <p className="text-xs mt-2 m-0 leading-relaxed" style={{ color: "#3b82f6" }}>
                    This should be the email your child&apos;s counselor used when adding them to the system. Your account will be linked to your child&apos;s profile automatically.
                  </p>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-semibold text-body mb-1.5">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@email.com" style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-body mb-1.5">Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" style={inputStyle} />
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>
              {error}
            </div>
          )}

          <button
            onClick={mode === "login" ? handleLogin : handleSignup}
            disabled={loading}
            className="w-full py-3 rounded-lg text-base font-semibold cursor-pointer border-none text-white mt-2"
            style={{ background: loading ? "#94a3b8" : "#3b82f6" }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}