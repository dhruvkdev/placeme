"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  X, GraduationCap, Building, Briefcase, 
  ArrowRight, CheckCircle2, Loader2, Github, Linkedin, Code2, UploadCloud
} from "lucide-react";

export default function AuthDrawer({ isOpen, onClose }) {
  const router = useRouter();
  
  // State Management
  const [authMode, setAuthMode] = useState("login");
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  // File Upload States
  const [uploadedFile, setUploadedFile] = useState(null);

  // Form States (Simplified for demo)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    referralCode: "",
    otp: "",
    companyRegNumber: "",
    companyName: "",
    collegeName: "",
    designation: "",
    github: "",
    linkedin: "",
    dsaProfile: ""
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
    }
  };

  // The 5-10 Second Fake Loading / Verification Sequence
  const simulateVerification = async (targetDashboard) => {
    setIsLoading(true);
    setStep("loading");
    
    const messages = [
      "Establishing secure connection...",
      "Encrypting credentials...",
      selectedRole === 'student' ? "Verifying college domain..." : "Running KYC compliance checks...",
      "Validating profile data...",
      "Provisioning dashboard...",
      "Finalizing setup..."
    ];

    const totalWaitTime = Math.floor(Math.random() * 5000) + 5000;
    const intervalTime = totalWaitTime / messages.length;

    for (let i = 0; i < messages.length; i++) {
      setLoadingText(messages[i]);
      await new Promise(resolve => setTimeout(resolve, intervalTime));
    }

    setIsLoading(false);
    onClose();
    
    // Reset state for next time
    setTimeout(() => {
      setStep(1);
      setSelectedRole(null);
      setUploadedFile(null);
    }, 500);
    
    router.push(targetDashboard);
  };

  const handleNextStep = (e) => {
    e?.preventDefault();
    
    if (authMode === 'login') {
      simulateVerification(`/dashboard/${selectedRole || 'student'}`);
      return;
    }

    if (selectedRole === 'student') {
      if (step === 2) setStep(3); 
      else if (step === 3) setStep(4); 
      else if (step === 4) simulateVerification('/dashboard/student');
    } else if (selectedRole === 'company') {
      if (step === 2) setStep(3); 
      else if (step === 3) simulateVerification('/dashboard/company');
    } else if (selectedRole === 'tnp') {
      if (step === 2) setStep(3); 
      else if (step === 3) simulateVerification('/dashboard/tnp');
    }
  };

  // ================= RENDER HELPERS =================

  const renderRoleSelection = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h3 className="text-xl font-serif italic text-[#2C6E8F] mb-6">Select your role</h3>
      
      {[
        { id: 'student', icon: GraduationCap, title: 'Student', desc: 'Apply for internships & placements' },
        { id: 'tnp', icon: Building, title: 'T&P Cell', desc: 'Manage college placement drives' },
        { id: 'company', icon: Briefcase, title: 'Company', desc: 'Hire top campus talent' }
      ].map((role) => (
        <button
          key={role.id}
          onClick={() => {
            setSelectedRole(role.id);
            setStep(2);
          }}
          className="w-full flex items-center p-4 border border-gray-200 bg-white hover:border-[#2C6E8F]/60 hover:shadow-md transition-all group text-left"
        >
          <div className="w-12 h-12 rounded bg-[#f3f7f6] group-hover:bg-[#2C6E8F] group-hover:text-white transition-colors flex items-center justify-center text-[#2C6E8F] mr-4 shrink-0">
            <role.icon size={20} />
          </div>
          <div>
            <h4 className="font-medium text-[#1A1A1A] group-hover:text-[#2C6E8F] transition-colors">{role.title}</h4>
            <p className="text-xs text-gray-500 mt-0.5">{role.desc}</p>
          </div>
          <ArrowRight size={16} className="ml-auto text-gray-300 group-hover:text-[#2C6E8F] transition-colors" />
        </button>
      ))}
    </div>
  );

  const renderBasicInfo = () => (
    <form onSubmit={handleNextStep} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <button type="button" onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-black mb-2 flex items-center gap-1">
          ← Back to roles
        </button>
        <h3 className="text-xl font-medium text-[#1A1A1A]">
          Create <span className="font-serif italic text-[#2C6E8F] capitalize">{selectedRole}</span> Account
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name / Contact Person</label>
          <input required type="text" name="name" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all" placeholder="Enter name" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {selectedRole === 'student' ? 'College Email (Institute ID)' : 'Official Work Email'}
          </label>
          <input required type="email" name="email" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all" placeholder="name@domain.edu" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
          <input required type="password" name="password" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] focus:ring-1 focus:ring-[#2C6E8F]/20 transition-all" placeholder="••••••••" />
        </div>
        
        {selectedRole === 'student' && (
           <div>
             <label className="block text-xs font-medium text-gray-600 mb-1.5">T&P Partner Code (Optional)</label>
             <input type="text" name="referralCode" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:border-[#2C6E8F] transition-all" placeholder="e.g. NITA_2026" />
             <p className="text-[10px] text-gray-400 mt-1">If your college is a partner, enter the code to bypass manual approval.</p>
           </div>
        )}
      </div>

      <button type="submit" className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors mt-4">
        Continue
      </button>
    </form>
  );

  const renderVerification = () => (
    <form onSubmit={handleNextStep} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h3 className="text-xl font-medium text-[#1A1A1A]">
          Verification <span className="font-serif italic text-[#2C6E8F]">Required</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {selectedRole === 'student' ? "We've sent an OTP to your institute email." : "Please provide your official details and documentation for KYC."}
        </p>
      </div>

      {/* --- STUDENT VERIFICATION --- */}
      {selectedRole === 'student' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Enter 6-Digit OTP</label>
          <input required type="text" maxLength={6} className="w-full border border-gray-300 p-3 text-center text-lg tracking-[0.5em] focus:outline-none focus:border-[#2C6E8F]" placeholder="••••••" />
        </div>
      )}

      {/* --- COMPANY VERIFICATION (Mix of text & file) --- */}
      {selectedRole === 'company' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Registered Company Name</label>
            <input required type="text" name="companyName" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="e.g. Acme Corp Ltd." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Registration No. (CIN/LLPIN)</label>
            <input required type="text" name="companyRegNumber" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="Enter registration number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload Incorporation/GST Certificate</label>
            <div className="relative border-2 border-dashed border-gray-300 p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-sm cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
              {uploadedFile ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="text-green-600 mb-2" size={24} />
                  <p className="text-xs font-medium text-gray-800">{uploadedFile.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Click to replace file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="text-gray-400 mb-2" size={24} />
                  <p className="text-xs font-medium text-gray-600">Click or drag document to upload</p>
                  <p className="text-[10px] text-gray-400 mt-1">PDF, DOCX, JPG (Max 5MB)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- T&P CELL VERIFICATION (Mix of text & file) --- */}
      {selectedRole === 'tnp' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Institute / University Name</label>
            <input required type="text" name="collegeName" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="e.g. National Institute of Technology" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Official Designation</label>
            <input required type="text" name="designation" onChange={handleInputChange} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="e.g. Head of Placements" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload Authorization Letter</label>
            <div className="relative border-2 border-dashed border-gray-300 p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-sm cursor-pointer">
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
              {uploadedFile ? (
                <div className="flex flex-col items-center">
                  <CheckCircle2 className="text-green-600 mb-2" size={24} />
                  <p className="text-xs font-medium text-gray-800">{uploadedFile.name}</p>
                  <p className="text-[10px] text-gray-500 mt-1">Click to replace file</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="text-gray-400 mb-2" size={24} />
                  <p className="text-xs font-medium text-gray-600">Click or drag document to upload</p>
                  <p className="text-[10px] text-gray-400 mt-1">Must be signed by college administration (PDF, DOCX)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <button type="submit" className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors mt-6">
        Verify & Continue
      </button>
    </form>
  );

  const renderStudentAdvanced = () => (
    <form onSubmit={handleNextStep} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="mb-6">
        <h3 className="text-xl font-medium text-[#1A1A1A]">
          Advanced <span className="font-serif italic text-[#2C6E8F]">Profile</span>
        </h3>
        <p className="text-sm text-gray-500 mt-1">Boost your ATS score instantly by linking your profiles.</p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Github className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input type="url" placeholder="GitHub URL" className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F]" />
        </div>
        <div className="relative">
          <Linkedin className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input type="url" placeholder="LinkedIn URL" className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F]" />
        </div>
        <div className="relative">
          <Code2 className="absolute left-3 top-3.5 text-gray-400" size={18} />
          <input type="url" placeholder="LeetCode / Codeforces URL" className="w-full border border-gray-300 p-3 pl-10 text-sm focus:outline-none focus:border-[#2C6E8F]" />
        </div>
      </div>

      <button type="submit" className="w-full bg-[#2C6E8F] text-white p-3.5 text-sm font-medium hover:bg-[#20526B] transition-colors flex justify-center items-center gap-2">
        Complete Registration <CheckCircle2 size={16} />
      </button>
      <button type="button" onClick={() => simulateVerification('/dashboard/student')} className="w-full text-xs text-gray-400 hover:text-black">
        Skip for now
      </button>
    </form>
  );

  const renderLoadingOverlay = () => (
    <div className="absolute inset-0 z-50 bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
      <Loader2 className="w-12 h-12 text-[#2C6E8F] animate-spin mb-6" />
      <h3 className="text-xl font-serif italic text-[#1A1A1A] mb-2">Processing Data</h3>
      <p className="text-sm text-gray-500 animate-pulse">{loadingText}</p>
      
      <div className="w-full max-w-xs bg-gray-100 h-1 mt-8 overflow-hidden rounded-full relative">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 7, ease: "linear" }}
          className="absolute top-0 left-0 h-full bg-[#2C6E8F]"
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={isLoading ? undefined : onClose}
            className="fixed inset-0 z-[100] bg-[#1A1A1A]/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col border-l border-[#2C6E8F]/20"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <span className="text-lg font-bold tracking-widest text-[#1A1A1A] uppercase">
                PlaceMe
              </span>
              {!isLoading && (
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                  <X size={20} />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
              {step === "loading" && renderLoadingOverlay()}

              {step !== "loading" && (
                <>
                  {step === 1 && (
                    <div className="flex bg-gray-100 p-1 rounded-sm mb-8">
                      <button 
                        onClick={() => setAuthMode('login')} 
                        className={`flex-1 py-2 text-sm font-medium transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                      >
                        Log In
                      </button>
                      <button 
                        onClick={() => setAuthMode('register')} 
                        className={`flex-1 py-2 text-sm font-medium transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:text-black'}`}
                      >
                        Register
                      </button>
                    </div>
                  )}

                  {authMode === 'login' && step === 1 ? (
                    <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-4 animate-in fade-in duration-500">
                      <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1.5">Role</label>
                         <select required onChange={(e) => setSelectedRole(e.target.value)} className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F] bg-white">
                           <option value="">Select your role...</option>
                           <option value="student">Student</option>
                           <option value="company">Company / Recruiter</option>
                           <option value="tnp">T&P Cell</option>
                         </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                        <input required type="email" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="name@domain.com" />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-medium text-gray-600">Password</label>
                          <a href="#" className="text-[10px] text-[#2C6E8F] hover:underline">Forgot?</a>
                        </div>
                        <input required type="password" className="w-full border border-gray-300 p-3 text-sm focus:outline-none focus:border-[#2C6E8F]" placeholder="••••••••" />
                      </div>
                      <button type="submit" className="w-full bg-[#1A1A1A] text-white p-3.5 text-sm font-medium hover:bg-black transition-colors mt-6">
                        Access Dashboard
                      </button>
                    </form>
                  ) : (
                    <>
                      {step === 1 && renderRoleSelection()}
                      {step === 2 && renderBasicInfo()}
                      {step === 3 && renderVerification()}
                      {step === 4 && selectedRole === 'student' && renderStudentAdvanced()}
                    </>
                  )}
                </>
              )}
            </div>

            {step !== "loading" && (
              <div className="p-6 border-t border-gray-100 bg-[#f3f7f6]/50 text-center shrink-0">
                <p className="text-xs text-gray-500">
                  By continuing, you agree to PlaceMe's <br/>
                  <a href="#" className="text-[#2C6E8F] hover:underline">Terms of Service</a> and <a href="#" className="text-[#2C6E8F] hover:underline">Privacy Policy</a>.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}