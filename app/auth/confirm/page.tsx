"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ConfirmPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const handleSetPassword = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#252525", fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        background: "#252525", borderRadius: 20, padding: 40, width: "100%", maxWidth: 400,
        border: "1px solid #2a2a2a", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, background: "#ebebeb", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 24,
          }}>🪨</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#ebebeb", margin: 0 }}>
            Welcome to Whetstone
          </h1>
          <p style={{ fontSize: 14, color: "#717171", marginTop: 8, marginBottom: 0 }}>
            Set a password to activate your student account.
          </p>
        </div>

        {done ? (
          <div style={{
            padding: "16px", background: "rgba(74,186,106,0.08)", border: "1px solid #4aba6a",
            borderRadius: 10, textAlign: "center", color: "#4aba6a", fontWeight: 600, fontSize: 14,
          }}>
            ✓ Account activated! Redirecting...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#a0a0a0", display: "block", marginBottom: 6 }}>
                Choose a Password
              </label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSetPassword()}
                autoFocus
                style={{
                  width: "100%", padding: "11px 14px", border: "1px solid #333",
                  borderRadius: 10, fontSize: 14, color: "#ebebeb", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "10px 14px", background: "rgba(229,91,91,0.08)", border: "1px solid rgba(229,91,91,0.2)",
                borderRadius: 8, fontSize: 13, color: "#e55b5b", marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSetPassword}
              disabled={loading || password.length < 6}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                cursor: loading || password.length < 6 ? "not-allowed" : "pointer",
                background: password.length >= 6 ? "#ebebeb" : "#333",
                color: password.length >= 6 ? "#111" : "#505050",
                fontWeight: 600, fontSize: 14,
              }}
            >
              {loading ? "Activating..." : "Activate My Account →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}