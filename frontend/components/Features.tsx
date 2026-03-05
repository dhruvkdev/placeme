"use client";

import { useState } from "react";
import { Link2, ArrowRight } from "lucide-react";
import AuthDrawer from "./AuthDrawer"; // Adjust the import path as needed

// Mock Placeme Logo to match the screenshot
const PlacemeLogo = ({ className = "", textClass = "text-gray-900" }) => (
  <div className={`flex items-center gap-1.5 ${className}`}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 20V4H9L15 15V4H19V20H15L9 9V20H5Z" fill="currentColor" className="transform -skew-x-12" />
    </svg>
    <span className={`font-bold text-[13px] tracking-wide ${textClass}`}>PLACEME</span>
  </div>
);

export default function Features() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = (state: boolean) => {
    setIsDrawerOpen(state);
    if (state) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  };

  return (
    <>
      <section className="py-12 md:py-20 bg-white overflow-hidden font-sans">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Header Section */}
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-[2.75rem] leading-tight font-medium text-gray-900 mb-4 md:mb-5">
              Our Intelligent <span className="font-serif italic text-[#74929F]">Placement Tools</span>
            </h2>
            <p className="text-lg sm:text-[1.1rem] text-gray-800 font-medium mb-3 md:mb-4">
              Designed for students, placement cells, and recruiters
            </p>
            <p className="text-sm md:text-[15px] text-gray-500 leading-relaxed max-w-[600px] mx-auto px-2">
              Our platform automates student profile management, recruiter discovery, placement drives, and internship coordination in one unified system.
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
            
            {/* Left Column - Fanned Out Cards */}
            <div className="w-full lg:w-[45%] relative h-[400px] sm:h-[500px] lg:h-[650px] flex justify-center pt-4 lg:pt-8 mt-4 lg:mt-0">
              
              {/* Soft Radial Glow behind the cards to match screenshot */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(116,146,159,0.15)_0%,transparent_60%)] pointer-events-none -z-10"></div>

              {/* Top Card (PM Agent) - Lowest Z-Index */}
              <div className="absolute top-0 lg:top-4 left-6 sm:left-12 lg:left-8 right-6 sm:right-16 lg:right-12 z-10 bg-white border border-gray-200 shadow-[0_4px_20px_rgb(0,0,0,0.06)] rounded-md aspect-[4/2.5] transform -rotate-[12deg] lg:-rotate-[15deg] origin-bottom-left flex flex-col overflow-hidden transition-transform duration-500 hover:-translate-y-2">
                <div className="p-4 sm:p-5 flex-shrink-0">
                  <PlacemeLogo className="mb-2" />
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg lg:text-xl leading-tight w-[85%]">Student Profile Manager</h3>
                </div>
                <div className="bg-[#f8f9fa] flex-grow relative overflow-hidden">
                  <div className="absolute top-4 left-8 right-0 bottom-0 bg-white shadow-sm border border-gray-200 rounded-tl-md p-3">
                    <div className="w-3/4 h-2 bg-gray-100 rounded mb-2"></div>
                    <div className="w-1/2 h-2 bg-gray-100 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Middle Card (QA Agent) */}
              <div className="absolute top-16 sm:top-24 lg:top-32 left-2 sm:left-6 lg:left-2 right-10 sm:right-10 lg:right-16 z-20 bg-gradient-to-br from-[#8a8d91] to-[#606368] border border-gray-400 shadow-[0_8px_30px_rgb(0,0,0,0.15)] rounded-md aspect-[4/2.5] transform -rotate-[6deg] lg:-rotate-[8deg] origin-bottom-left flex flex-col overflow-hidden transition-transform duration-500 hover:-translate-y-2">
                <div className="p-4 sm:p-5 flex-shrink-0">
                  <PlacemeLogo className="mb-2" textClass="text-white" />
                  <h3 className="font-bold text-white text-base sm:text-lg lg:text-xl leading-tight w-[85%]">Recruiter Discovery Dashboard</h3>
                </div>
                <div className="bg-white/10 flex-grow relative overflow-hidden">
                   <div className="absolute top-4 left-8 right-0 bottom-0 bg-white shadow-sm border border-gray-200 rounded-tl-md p-3">
                    <div className="flex gap-2">
                      <div className="w-1/3 h-16 sm:h-20 bg-gray-100 rounded"></div>
                      <div className="w-2/3 h-16 sm:h-20 bg-gray-100 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Card (Helix) - Highest Z-Index */}
              <div className="absolute top-32 sm:top-48 lg:top-[260px] -left-2 sm:left-0 lg:-left-4 right-14 sm:right-6 lg:right-20 z-30 bg-white border border-gray-200 shadow-[0_12px_40px_rgb(0,0,0,0.12)] rounded-md aspect-[4/2.5] transform -rotate-[2deg] origin-bottom-left flex flex-col overflow-hidden transition-transform duration-500 hover:-translate-y-2">
                <div className="p-4 sm:p-5 flex-shrink-0">
                  <PlacemeLogo className="mb-2" />
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg lg:text-xl leading-tight">Placement Drive Manager</h3>
                  <p className="text-[9px] sm:text-[10px] text-gray-500 mt-1 max-w-[90%]">Coordinate hiring drives, shortlist candidates, and manage recruiter interactions easily.</p>
                </div>
                <div className="bg-[#f8f9fa] flex-grow relative overflow-hidden">
                  <div className="absolute top-4 left-4 right-4 bottom-0 bg-white shadow-sm border border-gray-200 rounded-t-md p-3 flex">
                     <div className="w-10 sm:w-12 border-r border-gray-100 flex flex-col gap-1 pr-2">
                       <div className="w-full h-1 bg-gray-200"></div>
                       <div className="w-3/4 h-1 bg-gray-200"></div>
                     </div>
                     <div className="pl-2 flex-grow">
                       <div className="w-1/2 h-1 bg-blue-100 mb-1"></div>
                       <div className="w-3/4 h-1 bg-gray-100"></div>
                     </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Column - Video Player & Details */}
            <div className="w-full lg:w-[55%] flex flex-col">
              
              {/* Added the subtle border block specifically for larger screens as requested */}
              <div className="lg:border lg:border-gray-200/60 lg:bg-[#fcfcfc] lg:p-2 lg:shadow-sm lg:rounded-md">
                {/* Video Container */}
                <div 
                  className="relative w-full aspect-[16/10] bg-[#f8f9fa] flex items-center justify-center cursor-pointer overflow-hidden border border-gray-200 shadow-sm rounded-md"
                  onClick={() => setIsPlaying(true)}
                >
                  {isPlaying ? (
                    <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white p-6">
                      <p className="text-sm font-medium animate-pulse">Playing Video...</p>
                      <p className="text-xs text-gray-400 mt-2 text-center">(Replace this block with your video component)</p>
                    </div>
                  ) : (
                    <>
                      <div className="absolute top-0 left-0 w-full h-full p-4 sm:p-8 pb-0 pt-8 sm:pt-12 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 sm:mb-6"></div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 w-full sm:w-2/3 md:w-1/2 leading-tight mb-4 sm:mb-8 z-0">
                          Manage Student Profiles & Placement Drives
                        </h2>
                        
                        <div className="relative flex-grow hidden sm:block">
                          <div className="absolute top-0 left-4 sm:left-10 w-[85%] max-w-[350px] bg-white border border-gray-100 shadow-md rounded-md p-3 sm:p-4 z-10 transform -rotate-2">
                             <div className="flex items-center gap-2 mb-3 sm:mb-4">
                               <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-200 rounded-sm"></div>
                               <span className="text-[10px] sm:text-xs font-bold">Student Applications</span>
                             </div>
                             <div className="text-[10px] sm:text-xs text-gray-400 mb-2">Latest Updates</div>
                             <div className="bg-gray-50 p-2 rounded text-[9px] sm:text-[10px] text-gray-500 flex justify-between items-center border border-gray-100 mb-2">
                               <span className="truncate pr-2">New Internship Applications</span>
                               <span className="bg-white border border-gray-200 px-2 py-0.5 rounded flex-shrink-0">View</span>
                             </div>
                          </div>
                          
                          <div className="absolute top-10 sm:top-14 right-0 w-[90%] max-w-[400px] bg-white border border-gray-100 shadow-lg rounded-tl-md p-4 sm:p-5 z-20">
                             <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-gray-100 pb-2">
                               <span className="text-xs sm:text-sm font-bold">Placement Drive</span>
                               <div className="flex gap-1">
                                 <span className="text-[9px] sm:text-[10px] bg-gray-100 px-2 py-0.5 rounded">All</span>
                                 <span className="text-[9px] sm:text-[10px] text-gray-500 px-2 py-0.5">Active</span>
                               </div>
                             </div>
                             <div className="text-[10px] sm:text-xs font-bold mb-2">Shortlist</div>
                             <div className="flex items-center gap-2 mb-2">
                               <input type="checkbox" className="w-3 h-3 rounded-sm border-gray-300" checked readOnly/>
                               <span className="text-[10px] sm:text-[11px] text-gray-600">Shortlist eligible students</span>
                             </div>
                             <div className="flex items-center gap-2">
                               <input type="checkbox" className="w-3 h-3 rounded-sm border-gray-300" />
                               <span className="text-[10px] sm:text-[11px] text-gray-600">Schedule recruiter interviews</span>
                             </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Updated Play Button to match thin outline from screenshot */}
                      <div className="absolute inset-0 flex items-center justify-center z-30 transition-transform hover:scale-110">
                        <div className="bg-white/50 backdrop-blur-sm rounded-full p-3 sm:p-4 shadow-sm border border-white/60">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" className="ml-1 sm:w-[48px] sm:h-[48px]">
                            <polygon points="6 3 20 12 6 21 6 3"></polygon>
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Bottom Info Row */}
                <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row items-start sm:items-end justify-between px-2 pb-2 gap-4 sm:gap-0">
                  <div>
                    <h4 className="text-xl sm:text-[1.35rem] font-serif italic text-[#74929F] mb-1">Placement Manager</h4>
                    <p className="text-xs sm:text-[13px] text-gray-400 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5" /> Smart Campus Placement System
                    </p>
                  </div>
                  <button 
                    onClick={() => toggleDrawer(true)}
                    className="w-full sm:w-auto bg-[#1a1a1a] text-white px-5 py-2.5 hover:bg-black transition-colors flex items-center justify-center gap-2 text-[13px] font-medium tracking-wide rounded-sm"
                  >
                    Explore Platform <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* Global Auth Drawer Component */}
      <AuthDrawer isOpen={isDrawerOpen} onClose={() => toggleDrawer(false)} />
    </>
  );
}