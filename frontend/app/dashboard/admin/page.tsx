"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { apiFetch } from "@/lib/api";
import {
  Shield, Send, CheckCircle2, AlertCircle, Loader2, LogOut,
  Mail, Lock, ArrowRight, Copy, Users, Trash2, Building2, Search
} from "lucide-react";

export default function AdminDashboard() {
  const { user, login, logout, isLoading: authLoading } = useAuth();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; message: string; link?: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; type: "COMPANY" | "TNP" | null; name: string }>({
    isOpen: false,
    id: "",
    type: null,
    name: ""
  });
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Data State
  const [companies, setCompanies] = useState<any[]>([]);
  const [tnps, setTnps] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [tnpSearch, setTnpSearch] = useState("");

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [compRes, tnpRes] = await Promise.all([
        apiFetch("/admin/companies"),
        apiFetch("/admin/tnp")
      ]);

      if (compRes.ok) setCompanies(await compRes.json());
      if (tnpRes.ok) setTnps(await tnpRes.json());
    } catch (err) {
      showToast("Failed to load platform data");
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      fetchData();
    }
  }, [user]);

  const openDeleteModal = (id: string, type: "COMPANY" | "TNP", name: string) => {
    setDeleteModal({ isOpen: true, id, type, name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: "", type: null, name: "" });
  };

  const confirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;

    setDeleteLoading(true);
    try {
      if (deleteModal.type === "COMPANY") {
        const res = await apiFetch(`/admin/company/${deleteModal.id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Company deleted successfully");
          setCompanies(prev => prev.filter(c => c.id !== deleteModal.id));
        } else {
          showToast("Failed to delete company");
        }
      } else if (deleteModal.type === "TNP") {
        const res = await apiFetch(`/admin/tnp/${deleteModal.id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("T&P deleted successfully");
          setTnps(prev => prev.filter(t => t.id !== deleteModal.id));
        } else {
          showToast("Failed to delete T&P");
        }
      }
    } catch {
      showToast(`Error deleting ${deleteModal.type === "COMPANY" ? "company" : "T&P"}`);
    } finally {
      setDeleteLoading(false);
      closeDeleteModal();
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Login failed");
        setLoginLoading(false);
        return;
      }

      if (data.user.role !== "ADMIN") {
        setLoginError("This page is for administrators only.");
        setLoginLoading(false);
        return;
      }

      login(data.token, data.user);
    } catch {
      setLoginError("Failed to connect to server.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteResult(null);

    try {
      const res = await apiFetch("/admin/invite-tnp", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteResult({ success: false, message: data.error || "Invite failed" });
      } else {
        setInviteResult({
          success: true,
          message: data.message || "Invitation sent!",
          link: data.inviteLink,
        });
        setInviteEmail("");
        showToast("Invitation sent successfully!");
      }
    } catch {
      setInviteResult({ success: false, message: "Failed to connect to server." });
    } finally {
      setInviteLoading(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    showToast("Invite link copied to clipboard!");
  };

  // Show loading while auth hydrates
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2C6E8F] animate-spin" />
      </div>
    );
  }

  // Not logged in — show login form
  if (!user) {
    return (
      <div className="min-h-screen bg-[#f3f7f6] flex items-center justify-center px-4">
        {/* Background facets */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-[60%] h-full bg-gradient-to-br from-[#71a2b6] to-transparent opacity-20" style={{ clipPath: "polygon(0 0, 40% 0, 10% 100%, 0 100%)" }} />
          <div className="absolute top-0 right-0 w-[50%] h-[70%] bg-gradient-to-bl from-[#8cb5c2] to-transparent opacity-15" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 80%, 20% 100%)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <span className="text-xl font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Shield size={20} className="text-[#2C6E8F]" />
              <h1 className="text-2xl font-medium text-[#1A1A1A]">
                Admin <span className="font-serif italic text-[#2C6E8F]">Console</span>
              </h1>
            </div>
            <p className="text-sm text-gray-500 mt-2">Sign in with your administrator credentials</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white border border-gray-200 p-8 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                  placeholder="admin@example.com"
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-sm"
              >
                <AlertCircle size={14} />
                {loginError}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loginLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Protected admin access. Unauthorized use is prohibited.
          </p>
        </motion.div>
      </div>
    );
  }

  // Logged in but not ADMIN — shouldn't happen, but guard it
  if (user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-[#1A1A1A]">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">This page is for administrators only.</p>
          <button onClick={logout} className="mt-4 text-sm text-[#2C6E8F] hover:underline">Sign out</button>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 sm:bottom-10 left-1/2 z-[200] bg-[#1A1A1A] text-white px-6 py-3 rounded-sm shadow-xl flex items-center gap-3 text-sm font-medium"
          >
            <CheckCircle2 size={16} className="text-[#6B99A8]" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDeleteModal}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20, x: "-50%", translateY: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%", translateY: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, y: 20, x: "-50%", translateY: "-50%" }}
              className="fixed top-1/2 left-1/2 z-[160] w-full max-w-sm bg-white p-6 rounded-md shadow-2xl border border-gray-100 flex flex-col gap-6"
            >
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="text-red-600 h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-[#1A1A1A]">Delete Context?</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to delete <span className="font-semibold text-gray-800">{deleteModal.name}</span>? This action cannot be undone and will remove all associated platform data.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-sm transition-colors flex items-center gap-2 disabled:opacity-60"
                >
                  {deleteLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 h-[70px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-widest text-[#1A1A1A] uppercase">PlaceMe</span>
            <span className="text-xs text-gray-400 font-medium border-l border-gray-200 pl-3">Admin Console</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500 hidden sm:block">{user.email}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors font-medium"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 sm:px-8 py-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-medium text-[#1A1A1A] tracking-tight">
            Admin <span className="font-serif italic text-[#2C6E8F]">Dashboard</span>
          </h1>
          <p className="text-[15px] text-gray-500 mt-2">Manage platform access and invite T&P coordinators.</p>
        </motion.div>

        {/* Invite T&P Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <div className="bg-white border border-gray-200 p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-[#f4f8f9] rounded flex items-center justify-center text-[#2C6E8F]">
                <Users size={20} />
              </div>
              <div>
                <h2 className="text-lg font-medium text-[#1A1A1A]">Invite T&P Coordinator</h2>
                <p className="text-xs text-gray-500 mt-0.5">Send a magic link to onboard a college placement cell member.</p>
              </div>
            </div>

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  required
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="coordinator@college.edu"
                  className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={inviteLoading}
                className="bg-[#1A1A1A] text-white px-6 py-3 text-sm font-medium hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shrink-0"
              >
                {inviteLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Send size={14} /> Send Invite
                  </>
                )}
              </button>
            </form>

            {/* Invite Result */}
            <AnimatePresence>
              {inviteResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className={`p-4 rounded-sm border ${inviteResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <div className="flex items-start gap-2">
                      {inviteResult.success ? (
                        <CheckCircle2 size={16} className="text-green-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${inviteResult.success ? "text-green-800" : "text-red-800"}`}>
                          {inviteResult.message}
                        </p>
                        {inviteResult.link && (
                          <div className="mt-3 flex items-center gap-2">
                            <code className="flex-1 text-xs bg-white border border-green-200 p-2 rounded font-mono text-gray-700 truncate block">
                              {inviteResult.link}
                            </code>
                            <button
                              onClick={() => copyLink(inviteResult.link!)}
                              className="shrink-0 p-2 hover:bg-green-100 rounded transition-colors text-green-700"
                              title="Copy link"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Platform Data Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Companies List */}
          <div className="bg-white border border-gray-200 p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#2C6E8F]" />
                <h2 className="text-lg font-medium text-[#1A1A1A]">Companies</h2>
              </div>
              <span className="bg-[#f4f8f9] text-[#2C6E8F] text-xs font-medium px-2.5 py-1 rounded">
                Total: {companies.length}
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                placeholder="Search companies..."
                className="w-full border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all rounded-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {dataLoading ? (
                <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
              ) : companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No companies found</p>
              ) : (
                companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).map(company => (
                  <div key={company.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-100 bg-[#fafbfc] rounded-sm gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1A1A1A] truncate">{company.name}</p>
                      {company.website && <p className="text-xs text-gray-500 truncate">{company.website}</p>}
                    </div>
                    <button
                      onClick={() => openDeleteModal(company.id, "COMPANY", company.name)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors self-start sm:self-auto shrink-0"
                      title="Delete Company"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* TNP Section */}
          <div className="bg-white border border-gray-200 p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#2C6E8F]" />
                <h2 className="text-lg font-medium text-[#1A1A1A]">T&P Cells</h2>
              </div>
              <span className="bg-[#f4f8f9] text-[#2C6E8F] text-xs font-medium px-2.5 py-1 rounded">
                Total: {tnps.length}
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
              <input
                type="text"
                value={tnpSearch}
                onChange={(e) => setTnpSearch(e.target.value)}
                placeholder="Search T&P cells..."
                className="w-full border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all rounded-sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
              {dataLoading ? (
                <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-gray-400" /></div>
              ) : tnps.filter(t => (t.name || "").toLowerCase().includes(tnpSearch.toLowerCase()) || t.email.toLowerCase().includes(tnpSearch.toLowerCase())).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No T&P cells found</p>
              ) : (
                tnps.filter(t => (t.name || "").toLowerCase().includes(tnpSearch.toLowerCase()) || t.email.toLowerCase().includes(tnpSearch.toLowerCase())).map(tnp => (
                  <div key={tnp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-gray-100 bg-[#fafbfc] rounded-sm gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[#1A1A1A] truncate">{tnp.name || "Unnamed TNP"}</p>
                      <p className="text-xs text-gray-500 truncate">{tnp.email}</p>
                    </div>
                    <button
                      onClick={() => openDeleteModal(tnp.id, "TNP", tnp.name || tnp.email)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition-colors self-start sm:self-auto shrink-0"
                      title="Delete T&P"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
