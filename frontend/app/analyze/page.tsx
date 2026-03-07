"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Upload,
    FileText,
    X,
    Loader2,
    User,
    Mail,
    Phone,
    MapPin,
    Linkedin,
    Github,
    Briefcase,
    GraduationCap,
    Code,
    Star,
    AlertTriangle,
    TrendingUp,
    FolderOpen,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from "lucide-react";

/* ────────────────────────────── types ────────────────────────────── */

interface Candidate {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
}

interface Role {
    title: string;
    company: string;
    start_date: string;
    end_date: string;
    duration_months_estimate: number;
    responsibilities: string[];
    technologies: string[];
}

interface Experience {
    total_years_estimate: number;
    roles: Role[];
}

interface Education {
    degree: string;
    field: string;
    institution: string;
    year: string;
}

interface Project {
    name: string;
    description: string;
    technologies: string[];
}

interface Analysis {
    strengths: string[];
    weaknesses: string[];
    seniority_estimate: string;
    role_fit_score: number;
    confidence_score: number;
}

interface Skills {
    programming_languages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
    other: string[];
}

interface ResumeResult {
    candidate: Candidate;
    summary: string;
    skills: Skills;
    experience: Experience;
    education: Education[];
    projects: Project[];
    analysis: Analysis;
}

/* ────────────────────────────── helpers ────────────────────────────── */

const TAG_COLORS = [
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-emerald-100 text-emerald-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-cyan-100 text-cyan-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
];

function Tag({ text, index = 0 }: { text: string; index?: number }) {
    return (
        <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${TAG_COLORS[index % TAG_COLORS.length]}`}
        >
            {text}
        </span>
    );
}

function SectionTitle({
    icon: Icon,
    title,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md">
                <Icon className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
    );
}

function ScoreRing({
    score,
    max = 100,
    label,
    color,
}: {
    score: number;
    max?: number;
    label: string;
    color: string;
}) {
    const pct = Math.round((score / max) * 100);
    const r = 40;
    const circ = 2 * Math.PI * r;
    const offset = circ - (pct / 100) * circ;
    return (
        <div className="flex flex-col items-center gap-2">
            <svg width="100" height="100" className="-rotate-90">
                <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                />
                <motion.circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                />
            </svg>
            <div className="text-center -mt-16">
                <span className="text-2xl font-bold text-gray-900">{score}</span>
                <span className="text-sm text-gray-400">/{max}</span>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-4">{label}</p>
        </div>
    );
}

/* ────────────────────────────── card variants ────────────────────────────── */

const cardAnim = {
    hidden: { opacity: 0, y: 24 },
    show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.07, duration: 0.45, ease: "easeOut" },
    }),
};

/* ────────────────────────────── main page ────────────────────────────── */

export default function AnalyzePage() {
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResumeResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    const toggleRole = (idx: number) =>
        setExpandedRoles((prev) => {
            const copy = new Set(prev);
            copy.has(idx) ? copy.delete(idx) : copy.add(idx);
            return copy;
        });

    /* ── file handling ── */
    const handleFile = useCallback((f: File) => {
        if (f.type !== "application/pdf") {
            setError("Please upload a PDF file.");
            return;
        }
        setFile(f);
        setError(null);
        setResult(null);
    }, []);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
        },
        [handleFile]
    );

    /* ── submit ── */
    const analyze = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const fd = new FormData();
            fd.append("data", file);

            const res = await fetch("/api/analyze", { method: "POST", body: fd });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || "Analysis failed");
            }

            const data: ResumeResult = await res.json();
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    /* ── reset ── */
    const reset = () => {
        setFile(null);
        setResult(null);
        setError(null);
        setExpandedRoles(new Set());
    };

    /* ────────────────────────────── render ────────────────────────────── */
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
            {/* header */}
            <div className="max-w-5xl mx-auto px-4 pt-14 pb-6 text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-sm font-medium mb-5"
                >
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Analysis
                </motion.div>
                <motion.h1
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight"
                >
                    Resume <span className="text-indigo-600">Analyzer</span>
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-3 text-gray-500 max-w-lg mx-auto text-lg"
                >
                    Upload your resume and get instant, AI-driven insights on skills,
                    experience, and fit.
                </motion.p>
            </div>

            {/* upload zone */}
            <div className="max-w-3xl mx-auto px-4 mb-10">
                <AnimatePresence mode="wait">
                    {!result && (
                        <motion.div
                            key="upload"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                        >
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragging(true);
                                }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                onClick={() => inputRef.current?.click()}
                                className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all duration-300 p-12 text-center ${dragging
                                        ? "border-indigo-500 bg-indigo-50/60"
                                        : file
                                            ? "border-emerald-400 bg-emerald-50/40"
                                            : "border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                                    }`}
                            >
                                <input
                                    ref={inputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleFile(e.target.files[0]);
                                    }}
                                />

                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 rounded-full bg-emerald-100 text-emerald-600">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <p className="font-semibold text-gray-800">{file.name}</p>
                                        <p className="text-sm text-gray-400">
                                            {(file.size / 1024).toFixed(1)} KB — PDF
                                        </p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                reset();
                                            }}
                                            className="mt-1 text-sm text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer"
                                        >
                                            <X className="w-4 h-4" /> Remove
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <p className="font-semibold text-gray-700">
                                            Drag & drop your resume here
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            or click to browse — PDF only
                                        </p>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="mt-4 text-red-500 text-sm text-center"
                                >
                                    {error}
                                </motion.p>
                            )}

                            <button
                                disabled={!file || loading}
                                onClick={analyze}
                                className="mt-6 w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Analyzing… this may take up to 30 s
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Analyze Resume
                                    </>
                                )}
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* results */}
            {result && (
                <div className="max-w-5xl mx-auto px-4 pb-20 space-y-8">
                    {/* new analysis button */}
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={reset}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 cursor-pointer"
                    >
                        ← Upload another resume
                    </motion.button>

                    {/* ── candidate card ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={0}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <div className="flex flex-col md:flex-row md:items-center gap-6">
                            <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                {result.candidate.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-2xl font-bold text-gray-900">
                                    {result.candidate.name}
                                </h2>
                                <p className="text-gray-500 mt-1 line-clamp-2">
                                    {result.summary}
                                </p>
                                <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm text-gray-600">
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-4 h-4 text-gray-400" />{" "}
                                        {result.candidate.email}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4 text-gray-400" />{" "}
                                        {result.candidate.phone}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4 text-gray-400" />{" "}
                                        {result.candidate.location}
                                    </span>
                                    {result.candidate.linkedin && (
                                        <a
                                            href={`https://${result.candidate.linkedin}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                                        >
                                            <Linkedin className="w-4 h-4" /> LinkedIn
                                        </a>
                                    )}
                                    {result.candidate.github && (
                                        <a
                                            href={`https://${result.candidate.github}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center gap-1.5 text-indigo-600 hover:underline"
                                        >
                                            <Github className="w-4 h-4" /> GitHub
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* ── skills ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={1}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <SectionTitle icon={Code} title="Skills" />
                        <div className="grid md:grid-cols-2 gap-6">
                            {Object.entries(result.skills).map(
                                ([category, items]) =>
                                    items.length > 0 && (
                                        <div key={category}>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                                {category.replace(/_/g, " ")}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {items.map((s: string, i: number) => (
                                                    <Tag key={s} text={s} index={i} />
                                                ))}
                                            </div>
                                        </div>
                                    )
                            )}
                        </div>
                    </motion.div>

                    {/* ── experience ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={2}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <SectionTitle icon={Briefcase} title="Experience" />
                        <p className="text-sm text-gray-500 mb-6">
                            ~{result.experience.total_years_estimate} years total experience
                        </p>
                        <div className="space-y-5">
                            {result.experience.roles.map((role, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow"
                                >
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleRole(idx)}
                                    >
                                        <div>
                                            <h3 className="font-semibold text-gray-900">
                                                {role.title}
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                {role.company} · {role.start_date} – {role.end_date}
                                            </p>
                                        </div>
                                        {expandedRoles.has(idx) ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                    <AnimatePresence>
                                        {expandedRoles.has(idx) && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <ul className="mt-3 space-y-1.5">
                                                    {role.responsibilities.map((r, i) => (
                                                        <li
                                                            key={i}
                                                            className="text-sm text-gray-600 flex gap-2"
                                                        >
                                                            <span className="text-indigo-400 mt-1">•</span>
                                                            {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                                <div className="flex flex-wrap gap-2 mt-3">
                                                    {role.technologies.map((t, i) => (
                                                        <Tag key={t} text={t} index={i} />
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── education ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={3}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <SectionTitle icon={GraduationCap} title="Education" />
                        <div className="space-y-4">
                            {result.education.map((edu, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-100 rounded-xl p-5"
                                >
                                    <h3 className="font-semibold text-gray-900">
                                        {edu.degree} in {edu.field}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {edu.institution}
                                    </p>
                                    <p className="text-sm text-gray-400 mt-0.5">{edu.year}</p>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── projects ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={4}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <SectionTitle icon={FolderOpen} title="Projects" />
                        <div className="grid md:grid-cols-2 gap-5">
                            {result.projects.map((proj, idx) => (
                                <div
                                    key={idx}
                                    className="border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow"
                                >
                                    <h3 className="font-semibold text-gray-900">{proj.name}</h3>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-4">
                                        {proj.description}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {proj.technologies.map((t, i) => (
                                            <Tag key={t} text={t} index={i} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* ── analysis ── */}
                    <motion.div
                        variants={cardAnim}
                        initial="hidden"
                        animate="show"
                        custom={5}
                        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8"
                    >
                        <SectionTitle icon={TrendingUp} title="Analysis" />

                        {/* scores */}
                        <div className="flex flex-wrap justify-center gap-12 mb-8">
                            <ScoreRing
                                score={result.analysis.role_fit_score}
                                label="Role Fit"
                                color="#6366f1"
                            />
                            <ScoreRing
                                score={Math.round(result.analysis.confidence_score * 100)}
                                label="Confidence"
                                color="#8b5cf6"
                            />
                        </div>

                        <div className="flex items-center justify-center mb-8">
                            <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700">
                                Seniority: {result.analysis.seniority_estimate}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {/* strengths */}
                            <div>
                                <p className="flex items-center gap-2 font-semibold text-emerald-600 mb-3">
                                    <Star className="w-4 h-4" /> Strengths
                                </p>
                                <ul className="space-y-2">
                                    {result.analysis.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex gap-2">
                                            <span className="text-emerald-400 mt-0.5">✓</span>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* weaknesses */}
                            <div>
                                <p className="flex items-center gap-2 font-semibold text-amber-600 mb-3">
                                    <AlertTriangle className="w-4 h-4" /> Areas to Improve
                                </p>
                                <ul className="space-y-2">
                                    {result.analysis.weaknesses.map((w, i) => (
                                        <li key={i} className="text-sm text-gray-600 flex gap-2">
                                            <span className="text-amber-400 mt-0.5">!</span>
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
