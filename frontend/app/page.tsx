import Hero from "@/components/Hero";
import ProblemStatement from "@/components/ProblemStatement";
import Flowchart from "@/components/Flowchart";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Hero />
      <ProblemStatement />
      <Flowchart />
      <Features />
      <Testimonials />
      <FAQ />
    </div>
  );
}
