"use client";

import React, { useState, useEffect } from 'react';

const testimonials = [
  {
    quote: "Working with Placeme on our turnkey projects has been an outstanding experience. The team has been incredibly responsive, consistently exceeding our expectations and going the extra mile to deliver results. Their professionalism and dedication made every step smooth and successful—we couldn't be happier with the partnership!",
    name: "Jebu Ittiachen",
    role: "CTO, SPRY",
    desc: "(Saas company backed by Flourish Ventures)",
    logo: "SPRY",
    logoClass: "font-black text-4xl tracking-tighter"
  },
  {
    quote: "Partnering with them transformed our campus drives. Their 'Placement as a Service' platform is seamless, allowing our students to connect with top-tier companies effortlessly. In short, to all the T&P officers out there, don't worry about the logistics... they are there for you!",
    name: "Dr. A. K. Sharma",
    role: "T&P Officer, NIT",
    desc: "(Premier National Institute of Technology)",
    logo: "NIT",
    logoClass: "font-serif font-bold text-3xl text-gray-800"
  },
  {
    quote: "Hiring fresh talent used to be a logistical nightmare. Now, we get pre-assessed, high-quality candidates directly from top campuses without the hassle. It's fast, responsive, and delivers with precision.",
    name: "Sneha Patel",
    role: "HR Head, TechNova",
    desc: "(Leading AI & Cloud Solutions Provider)",
    logo: "TechNova",
    logoClass: "font-extrabold text-2xl tracking-wide text-blue-900"
  },
  {
    quote: "A game-changer for our placement cell. Their dedicated support and wide network of recruiters ensured a record-breaking placement season. They bridge the gap between academia and industry perfectly.",
    name: "Prof. Anjali Desai",
    role: "Director of Placements, VIT",
    desc: "(Top-ranked private engineering institute)",
    logo: "VIT",
    logoClass: "font-bold text-3xl text-indigo-950"
  },
  {
    quote: "The 'Placement as a Service' model is exactly what modern educational institutions need. It took the operational burden off our shoulders and directly increased our placement rates by 40% this year.",
    name: "Dr. R.K. Mehta",
    role: "Dean, BITS",
    desc: "(Institute of Eminence in Engineering)",
    logo: "BITS",
    logoClass: "font-black text-2xl text-red-800 tracking-tight"
  },
  {
    quote: "The platform's precision in matching candidate skills to our job roles is outstanding. We saved countless hours in our recruitment cycle and onboarded some of the brightest minds this year.",
    name: "Arun Kumar",
    role: "Talent Acquisition, InnovateCorp",
    desc: "(Fast-growing Fintech Unicorn)",
    logo: "Innovate",
    logoClass: "font-bold text-2xl italic text-slate-800"
  },
  {
    quote: "Exceptional service! We found our best entry-level engineers through their targeted placement drives. If you are a founder looking for tech talent, trust them as your go-to team for campus hiring.",
    name: "Chavan B",
    role: "Cofounder, Strike",
    desc: "(Y-Combinator backed startup)",
    logo: "Strike",
    logoClass: "font-black text-3xl text-blue-600"
  }
];

const TestimonialCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-play functionality
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000); // Changes every 5 seconds

    return () => clearInterval(timer);
  }, [currentIndex]);

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1));
  };

  const current = testimonials[currentIndex];

  return (
    <section className="relative flex items-center justify-center min-h-screen bg-white font-sans overflow-hidden">
      
      {/* --- STRUCTURAL GRID OVERLAY --- */}
      
      {/* Vertical Lines (Constrained to max-w-[85rem]) */}
      <div className="absolute inset-0 pointer-events-none flex justify-center z-0">
        <div className="w-full max-w-[85rem] border-l border-r border-black/20 h-full"></div>
      </div>

      {/* Top Horizontal Line (Full width, flush with top) */}
      <div className="absolute top-0 left-0 w-full border-t border-black/20 pointer-events-none z-0"></div>

      {/* Bottom Horizontal Line (Full width, flush with bottom) */}
      <div className="absolute bottom-0 left-0 w-full border-b border-black/20 pointer-events-none z-0"></div>


      {/* --- CONTENT CONTAINER --- */}
      <div className="relative w-full max-w-[85rem] flex flex-col items-center justify-center py-20 md:py-32 px-4 md:px-16 z-10">
        
        {/* Soft Radial Gradient Background - Constrained to the center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0">
          <div className="w-[300px] h-[300px] md:w-[600px] md:h-[350px] bg-cyan-100/50 rounded-full blur-[50px] md:blur-[60px]"></div>
        </div>

        {/* Quote Content Container */}
        <div className="relative w-full max-w-3xl px-2 md:px-8 text-left md:text-center z-10">
          
          {/* Top Left Quote Icon */}
          <div className="absolute -top-6 -left-2 md:-top-4 md:-left-4 text-[#e2ecef] pointer-events-none">
            <svg className="w-16 h-16 md:w-[80px] md:h-[80px]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
            </svg>
          </div>

          {/* Testimonial Text */}
          <p className="text-[#2d3748] text-[15px] sm:text-lg md:text-[1.15rem] leading-[1.7] font-medium relative z-10 px-2 md:px-6">
            {current.quote}
          </p>

          {/* Bottom Right Quote Icon */}
          <div className="absolute -bottom-10 right-0 md:-bottom-8 md:-right-4 text-[#e2ecef] pointer-events-none rotate-180">
            <svg className="w-16 h-16 md:w-[80px] md:h-[80px]" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
            </svg>
          </div>
        </div>

        {/* Author Block */}
        <div className="flex items-center justify-start md:justify-center gap-4 md:gap-6 mt-10 md:mt-14 z-10 w-full md:w-auto px-4 md:px-0">
          {/* Company Logo placeholder */}
          <div className={`flex-shrink-0 flex items-center justify-center transform scale-75 md:scale-100 origin-left md:origin-center ${current.logoClass}`}>
             {current.logo}
          </div>
          
          {/* Author Details */}
          <div className="flex flex-col text-left">
            <h4 className="text-[#659ebb] font-serif italic text-lg md:text-[1.3rem] tracking-wide">
              {current.name}
            </h4>
            <p className="text-gray-800 text-[11px] md:text-[13px] font-semibold mt-[2px]">
              {current.role}
            </p>
            <p className="text-gray-800 text-[11px] md:text-[13px] font-semibold leading-tight md:leading-normal">
              {current.desc}
            </p>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center gap-4 md:gap-6 mt-12 md:mt-16 z-10">
          <button onClick={prevTestimonial} className="text-gray-400 hover:text-gray-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          
          <div className="flex gap-2.5">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-[7px] w-[7px] rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-[#2d3748] scale-110' : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          <button onClick={nextTestimonial} className="text-gray-400 hover:text-gray-800 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

      </div>
    </section>
  );
};

export default TestimonialCarousel;