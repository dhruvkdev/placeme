"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import {
  CheckCircle2, AlertCircle, Loader2, Lock, User, ArrowRight, Shield
} from "lucide-react";

function SetupAccountForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const { login } = useAuth();

  const [stage, setStage] = useState<"validating" | "form" | "success" | "error">("validating");
  const [tokenEmail, setTokenEmail] = useState("");
  const [tokenRole, setTokenRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!tokenParam) {
      setErrorMsg("No invitation token provided.");
      setStage("error");
      return;
    }

    (async () => {
      try {
        const res = await apiFetch(`/invite/validate?token=${encodeURIComponent(tokenParam)}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || "Invalid or expired invitation.");
          setStage("error");
          return;
        }

        setTokenEmail(data.email);
        setTokenRole(data.role || "TNP");
        setStage("form");
      } catch {
        setErrorMsg("Failed to connect to server.");
        setStage("error");
      }
    })();
  }, [tokenParam]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await apiFetch("/invite/register", {
        method: "POST",
        body: JSON.stringify({ token: tokenParam, name, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Registration failed.");
        setSubmitLoading(false);
        return;
      }

      // Log in with the returned token + user
      login(data.token, data.user);
      setStage("success");

      // Redirect to the appropriate dashboard
      setTimeout(() => {
        const role = (data.user.role || tokenRole).toLowerCase();
        router.push(`/dashboard/${role}`);
      }, 1500);
    } catch {
      setSubmitError("Failed to connect to server.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7f6] flex items-center justify-center px-4">
      {/* Background facets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[50%] h-[70%] bg-gradient-to-bl from-[#8cb5c2] to-transparent opacity-15" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 80%, 20% 100%)" }} />
        <div className="absolute bottom-0 left-0 w-[40%] h-[50%] bg-gradient-to-tr from-[#71a2b6] to-transparent opacity-10" style={{ clipPath: "polygon(0 40%, 60% 0, 80% 100%, 0 100%)" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield size={20} className="text-[#2C6E8F]" />
            <h1 className="text-2xl font-medium text-[#1A1A1A]">
              Set Up Your <span className="font-serif italic text-[#2C6E8F]">Account</span>
            </h1>
          </div>
        </div>

        {/* Validating */}
        {stage === "validating" && (
          <div className="bg-white border border-gray-200 p-10 shadow-sm flex flex-col items-center gap-4">
            <Loader2 size={32} className="text-[#2C6E8F] animate-spin" />
            <p className="text-sm text-gray-600">Verifying your invitation…</p>
          </div>
        )}

        {/* Error */}
        {stage === "error" && (
          <div className="bg-white border border-gray-200 p-10 shadow-sm flex flex-col items-center gap-4">
            <AlertCircle size={40} className="text-red-400" />
            <h2 className="text-lg font-medium text-red-700">Invalid Invitation</h2>
            <p className="text-sm text-gray-600 text-center">{errorMsg}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-2 text-sm text-[#2C6E8F] hover:underline font-medium"
            >
              Go to Homepage
            </button>
          </div>
        )}

        {/* Reg Form */}
        {stage === "form" && (
          <>
            <p className="text-center text-sm text-gray-500 mb-6">
              You've been invited as <span className="font-semibold text-[#2C6E8F]">{tokenRole}</span> for{" "}
              <span className="font-semibold text-[#1A1A1A]">{tokenEmail}</span>
            </p>

            <form onSubmit={handleRegister} className="bg-white border border-gray-200 p-8 shadow-sm space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-gray-400" size={16} />
                  <input
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                    placeholder="Re-enter password"
                  />
                </div>
              </div>

              {submitError && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm">
                  <AlertCircle size={14} />
                  {submitError}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitLoading ? <Loader2 size={16} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
              </button>
            </form>
          </>
        )}

        {/* Success */}
        {stage === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border border-gray-200 p-10 shadow-sm flex flex-col items-center gap-4">
            <CheckCircle2 size={40} className="text-green-500" />
            <h2 className="text-lg font-medium text-[#1A1A1A]">Account Created!</h2>
            <p className="text-sm text-gray-600 text-center">Redirecting you to your dashboard…</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function SetupAccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f3f7f6] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2C6E8F] animate-spin" />
      </div>
    }>
      <SetupAccountForm />
    </Suspense>
  );
}
