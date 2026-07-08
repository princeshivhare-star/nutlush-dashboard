"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Leaf } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm bg-white border border-line rounded-xl2 p-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-green-soft flex items-center justify-center">
            <Leaf size={16} className="text-green" />
          </div>
          <span className="font-display font-bold text-lg text-green-deep">Nutlush</span>
        </div>
        <p className="text-sm text-inksoft mb-6">Sign in to manage paid subscribers.</p>

        {status === "sent" ? (
          <div className="text-sm bg-green-soft text-green-deep rounded-lg p-3">
            Check <span className="font-medium">{email}</span> for a sign-in link. You can close this tab.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="you@nutlush.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border border-line rounded-lg px-3 py-2 text-sm bg-cream outline-none focus:border-green"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="bg-green text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60"
            >
              {status === "sending" ? "Sending link…" : "Send sign-in link"}
            </button>
            {status === "error" && (
              <div className="text-xs text-coral">{errorMsg}</div>
            )}
          </form>
        )}

        <p className="text-xs text-inksoft mt-6">
          Only email addresses added to the team list by an admin can access the dashboard.
        </p>
      </div>
    </div>
  );
}
