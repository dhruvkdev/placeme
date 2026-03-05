"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

// Custom SVG Wireframes to match the screenshot aesthetic
const WireframeShape = ({ type }: { type: number }) => {
  const svgProps = {
    viewBox: "0 0 100 100",
    fill: "none",
    stroke: "#6899a1", 
    strokeWidth: "0.4",
    className: "w-32 h-32 md:w-56 md:h-56 opacity-80", 
  };

  if (type === 0) {
    return (
      <svg {...svgProps}>
        <ellipse cx="50" cy="30" rx="18" ry="25" />
        <ellipse cx="50" cy="30" rx="8" ry="25" />
        <ellipse cx="50" cy="30" rx="18" ry="6" />
        <ellipse cx="50" cy="30" rx="18" ry="14" />
        <ellipse cx="50" cy="70" rx="18" ry="25" />
        <ellipse cx="50" cy="70" rx="8" ry="25" />
        <ellipse cx="50" cy="70" rx="18" ry="6" />
        <ellipse cx="50" cy="70" rx="18" ry="14" />
        <path d="M 32 30 L 32 70 M 68 30 L 68 70" />
      </svg>
    );
  }

  if (type === 1) {
    return (
      <svg {...svgProps}>
        <circle cx="50" cy="50" r="35" />
        <path d="M 50 15 L 25 35 L 35 65 L 65 65 L 75 35 Z" />
        <path d="M 50 15 L 50 50 L 25 35" />
        <path d="M 50 50 L 75 35" />
        <path d="M 50 50 L 35 65" />
        <path d="M 50 50 L 65 65" />
        <path d="M 15 50 L 25 35" />
        <path d="M 15 50 L 35 65" />
        <path d="M 85 50 L 75 35" />
        <path d="M 85 50 L 65 65" />
        <path d="M 35 65 L 50 85 L 65 65" />
        <circle cx="50" cy="50" r="15" />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <ellipse cx="50" cy="60" rx="35" ry="12" />
      <path d="M 50 15 L 15 60 L 50 95 L 85 60 Z" />
      <path d="M 50 15 L 30 60 L 50 95" />
      <path d="M 50 15 L 70 60 L 50 95" />
      <path d="M 50 15 L 50 95" />
      <line x1="47" y1="15" x2="53" y2="15" />
    </svg>
  );
};

export default function Flowchart() {
  const targetRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: targetRef });
  
  // State to hold dynamic transform endpoint based on screen width
  const [xEnd, setXEnd] = useState("-45%");

  useEffect(() => {
    const updateXEnd = () => {
      // Mobile screens need to move much further to the left to see the last card
      if (window.innerWidth < 640) {
        setXEnd("-82%");
      } else if (window.innerWidth < 1024) {
        setXEnd("-65%");
      } else {
        setXEnd("-45%");
      }
    };

    updateXEnd(); // Set initially
    window.addEventListener("resize", updateXEnd);
    return () => window.removeEventListener("resize", updateXEnd);
  }, []);

  // Use the dynamic xEnd value for the transformation
  const x = useTransform(scrollYProgress, [0, 1], ["0%", xEnd]);

  const steps = [
    {
      id: "01",
      title: "Student Profile Creation",
      description: "Students create verified profiles with resumes, projects, GitHub links, and academic details."
    },
    {
      id: "02",
      title: "Centralized Data Hub",
      description: "All student information, assessments, and achievements are organized into a single platform."
    },
    {
      id: "03",
      title: "Recruiter Access",
      description: "Recruiters explore verified student profiles, skills, and projects through a searchable dashboard."
    },
    {
      id: "04",
      title: "Smart Shortlisting",
      description: "Intelligent filters and matching help recruiters quickly shortlist the right candidates."
    },
    {
      id: "05",
      title: "Placement & Internship Offers",
      description: "Students receive opportunities and placement cells manage hiring drives with full transparency."
    }
  ];

  return (
    // Increased mobile height (h-[400vh]) to allow enough scrolling time so it doesn't rush past
    <section ref={targetRef} className="relative h-[400vh] md:h-[300vh] bg-white font-sans">
      
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col bg-white">
        
        {/* Header Block */}
        <div className="w-full text-center max-w-4xl mx-auto px-4 pt-12 sm:pt-16 md:pt-24 pb-4 md:pb-8 flex-shrink-0 z-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight mb-3 md:mb-4 text-[#333]">
            <span className="text-[#6899a1] font-serif italic mr-2">How we</span> 
            streamline placements.
          </h2>
          <p className="text-sm md:text-base lg:text-lg text-gray-600 max-w-2xl lg:max-w-3xl mx-auto px-4">
            Our platform simplifies how students, placement cells, and recruiters coordinate internships and placement drives.
          </p>
        </div>

        {/* Scroll Track Block */}
        <div className="flex-1 relative flex items-center w-full">
          
          <motion.div 
            style={{ x }} 
            className="flex gap-8 sm:gap-16 md:gap-24 pl-[5vw] sm:pl-[10vw] pr-[5vw] sm:pr-[10vw] relative z-10 w-max items-center"
          >
            
            {/* The Connecting Line */}
            <div 
              className="absolute top-[35%] md:top-[40%] left-[5vw] sm:left-[10vw] h-1.5 md:h-2 bg-[#3f6d78] -z-10" 
              style={{ width: 'calc(100% - 10vw)' }} 
            />

            {steps.map((step, index) => (
              <div
                key={index}
                className="w-[280px] sm:w-[320px] md:w-[420px] h-[380px] sm:h-[420px] md:h-[500px] bg-white border border-[#6899a1]/40 flex flex-col relative shadow-sm"
              >
                {/* Card Header */}
                <div className="px-5 py-4 md:px-8 md:py-5 border-b border-[#6899a1]/30 flex gap-2 md:gap-3 items-center">
                  <span className="text-[#6899a1] font-serif italic text-xl sm:text-2xl md:text-3xl">
                    {step.id}
                  </span>
                  <h3 className="text-[#6899a1] font-serif italic text-xl sm:text-2xl md:text-3xl">
                    {step.title}
                  </h3>
                </div>

                {/* Card Body */}
                <div className="p-5 md:p-8 flex-1 flex flex-col">
                  <p className="text-gray-600 text-[13px] sm:text-[14px] md:text-[15px] leading-relaxed h-[70px] md:h-[80px]">
                    {step.description}
                  </p>
                  
                  {/* Decorative Wireframes */}
                  <div className="flex-1 w-full flex items-center justify-center">
                     <WireframeShape type={index % 3} />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
        
      </div>
    </section>
  );
}