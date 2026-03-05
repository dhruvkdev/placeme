"use client";

import { useState } from "react";
import { Linkedin, Youtube, Instagram, Twitter, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Footer() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState({ title: "", content: "" });

  const openDrawer = (title: string) => {
    const drawerTexts: Record<string, string> = {
      "About Us": `Placeme is built with a single mission in mind: helping students bridge the gap between academic learning and real career opportunities. Many talented students graduate every year with strong potential but limited access to structured placement preparation, industry insights, and mentorship. Placeme aims to solve that problem by creating a platform where students can learn, prepare, and grow together while also connecting with organizations that are looking for skilled young professionals.

Our journey started with a simple observation. Most students begin thinking seriously about placements only in their final year, often realizing too late that they needed structured preparation in areas like data structures, aptitude, resume building, communication skills, and real-world project experience. Placeme was designed to guide students much earlier in their journey so they can build confidence and competence step by step.

The platform focuses on practical growth. Instead of overwhelming students with theory alone, Placeme encourages hands‑on learning, project building, and consistent improvement through small, achievable milestones. Students can track their progress, understand their strengths, and identify areas where they need improvement.

Placeme also believes that mentorship plays a crucial role in shaping careers. Many successful professionals had mentors who guided them through difficult decisions, helped them understand industry expectations, and motivated them during challenging times. Our vision is to recreate that experience digitally so students everywhere can access meaningful guidance.

We also strongly believe that opportunity should not be limited by geography or background. Talented students exist in every college and every city. Placeme aims to bring visibility to that talent by creating a transparent system where skill, effort, and dedication matter more than connections.

In the long term, Placeme wants to build a community where learning never stops. Even after students secure their first job, they should continue growing their skills and supporting the next generation of learners. A healthy ecosystem forms when people who succeed return to mentor and inspire others.

Our philosophy is simple: consistent effort beats last‑minute panic. Small improvements every day compound into massive growth over time. Placeme is here to support that journey — from the first line of code a student writes to the moment they receive their first job offer and beyond.

While this section currently serves as a placeholder, it represents the kind of story most startup platforms share: a mission, a problem they want to solve, and a long‑term vision for impact. As Placeme evolves, this section will eventually include real stories about students who used the platform, companies who discovered great talent, and a growing community built around learning and opportunity.

Placeme ultimately stands for preparation, opportunity, and growth. The goal is not just to help students get placed — it is to help them build meaningful careers with confidence, skills, and a mindset of continuous improvement.`,

      "Partner With Us": `Placeme is designed to be a collaborative ecosystem where educational institutions, student communities, mentors, and companies work together to create better career opportunities. The Partner With Us section explains how organizations and individuals can collaborate with the platform to support student growth and talent discovery.

Companies constantly look for skilled graduates who are job‑ready from day one. However, the traditional recruitment process often filters candidates based primarily on resumes or college reputation. Placeme aims to change this by giving companies a deeper understanding of candidate ability through projects, coding performance, collaboration skills, and learning consistency.

When organizations partner with Placeme, they gain access to a growing pool of motivated learners who are actively building skills relevant to industry demands. Instead of evaluating candidates based only on theoretical knowledge, recruiters can see practical work, real problem‑solving ability, and long‑term dedication.

Partnerships with companies can take several forms. Organizations may choose to host coding challenges, sponsor learning tracks, mentor student groups, conduct workshops, or participate in hiring events organized through the platform. These collaborations allow companies to engage with talent early while also contributing to student development.

Educational institutions can also partner with Placeme to strengthen their placement ecosystem. Colleges can integrate platform resources into training programs, allowing students to track skill development and participate in guided preparation modules. Faculty members can monitor progress and support students in targeted areas where improvement is needed.

Mentors and industry professionals are another key part of the ecosystem. Experienced developers, designers, product managers, and engineers can share insights that textbooks rarely provide. Through mentorship sessions, Q&A discussions, and career guidance events, mentors can help students understand the realities of working in modern technology environments.

Student communities and technical clubs can also collaborate with Placeme by organizing hackathons, project showcases, and learning initiatives. These events encourage peer learning and create opportunities for students to work on real problems together.

Placeme believes that strong partnerships lead to stronger outcomes. When companies contribute to training and students understand industry expectations earlier, the gap between education and employment becomes smaller.

This placeholder section demonstrates the type of information typically shared with potential partners: collaboration opportunities, benefits for organizations, and ways to engage with the community. As the platform grows, this section will include real partnership stories, testimonials from companies, and examples of successful collaborations.

By partnering with Placeme, organizations are not just recruiting talent. They are investing in the future workforce and helping shape a generation of professionals who are better prepared for the challenges of the modern workplace.`,

      "Contact Us": `The Contact Us section is where visitors can reach the Placeme team for questions, support requests, collaboration inquiries, or feedback about the platform. Communication plays an important role in building trust with users, and a clear contact channel ensures that students and organizations always know how to get help when they need it.

Students may want to reach out for many reasons. They might need help understanding how the platform works, reporting a technical issue, requesting guidance about career preparation, or sharing feedback about features they would like to see in the future. Placeme encourages open communication because feedback from real users helps improve the platform continuously.

Companies and recruiters may contact Placeme to explore partnership opportunities or discuss hiring initiatives. Organizations often want to understand how the platform evaluates student skills, what types of assessments are available, and how recruitment workflows can be integrated with their existing hiring processes.

Educational institutions may also contact the Placeme team to discuss institutional collaborations. Colleges interested in strengthening their placement training programs can explore integration options, mentorship opportunities, and joint events designed to prepare students more effectively for industry expectations.

Another important reason people reach out is technical support. Modern platforms involve multiple components including user dashboards, analytics systems, coding environments, and content delivery modules. If a user experiences a bug or unexpected behavior, quick support ensures that their learning experience is not disrupted.

A strong support system also builds confidence among users. When students know they can reach a real team that listens and responds, they feel more comfortable investing their time and effort into the platform.

Typically, a Contact Us page includes multiple communication options such as email support, feedback forms, community discussion channels, and sometimes even live chat. Many modern platforms also maintain social media channels where users can stay updated about announcements, new features, and community events.

As Placeme grows, this section will eventually include direct contact information, response timelines, and possibly a help center with frequently asked questions. The goal is to make sure every user interaction with the platform is smooth and supportive.

For now, this placeholder content represents the type of message a professional platform would include: openness to communication, commitment to user support, and an invitation for the community to participate in improving the product.`,

      "Privacy Policy": `Privacy is a critical component of any digital platform. The Privacy Policy explains how user information is collected, used, stored, and protected. For platforms like Placeme that involve student profiles, learning data, and career information, transparency about data usage is extremely important.

When users create accounts on a platform, they often share personal information such as names, email addresses, academic details, project work, and sometimes professional aspirations. This information helps personalize the learning experience and enables companies to evaluate candidate potential.

However, users must also feel confident that their data will be handled responsibly. A strong privacy policy outlines exactly what information is collected, why it is collected, and how it is protected from unauthorized access.

Placeme aims to follow responsible data practices that prioritize user safety and transparency. Information collected through the platform is used primarily to improve the learning experience, personalize content recommendations, track progress, and connect students with relevant career opportunities.

Security measures such as encrypted connections, secure authentication systems, and controlled access protocols help ensure that sensitive information remains protected. Only authorized systems and personnel should be able to interact with critical data.

Another important aspect of privacy policies is user control. Platforms should allow users to update their information, control visibility of certain profile details, and request deletion of their accounts if they choose to leave the platform.

Transparency also means informing users about cookies, analytics tools, and other technologies that help platforms understand usage patterns. These insights allow developers to improve performance, optimize user experience, and build features that align with community needs.

For companies interacting with student profiles, the privacy policy ensures that candidate information is used strictly for recruitment or evaluation purposes and not misused for unrelated activities.

As Placeme evolves into a production platform, this section will eventually contain legally reviewed policy text that complies with applicable data protection regulations. The placeholder content you are reading now demonstrates the general structure and purpose of such a policy.

Ultimately, privacy policies are about trust. Users share their information with the expectation that platforms will respect and protect it. Placeme intends to maintain that trust through transparency, security, and responsible data practices.`,

      "Refund Policy": `The Refund Policy describes how payments, cancellations, and refunds are handled on the platform. While Placeme may currently offer free learning resources, many modern educational platforms eventually include premium services such as advanced mentorship programs, specialized training tracks, certification assessments, or exclusive career preparation modules.

Whenever financial transactions are involved, users need clarity about payment conditions. A well‑defined refund policy ensures fairness and transparency for both the platform and its users.

For example, if a student enrolls in a paid mentorship program but later decides the program is not suitable for their goals, the refund policy explains whether they are eligible for a refund and under what conditions. Some platforms allow refunds within a limited time window after purchase, while others offer partial refunds depending on how much of the program has already been accessed.

Refund policies also address scenarios involving technical issues. If a user cannot access purchased content due to system errors or service disruptions, the platform may provide compensation or refunds to ensure fairness.

Another common component is subscription management. If the platform offers monthly or annual plans, users should clearly understand how to cancel subscriptions and whether unused time can be refunded.

Transparency reduces misunderstandings and builds credibility. When users know the exact rules governing payments and refunds, they feel more comfortable investing in premium services.

Refund policies also protect the platform from misuse. Without clear rules, individuals could repeatedly purchase and refund services after consuming the content. Balanced policies create fairness for both sides.

As Placeme grows, the refund policy will likely evolve based on the types of services offered. For example, mentorship programs, workshops, or certification exams may each have slightly different refund conditions depending on the resources involved.

This placeholder section demonstrates the structure such a policy would typically follow: explanation of eligible cases, timelines for requests, processing procedures, and communication channels for refund inquiries.

The goal is simple: provide clarity, maintain fairness, and ensure that users always understand the financial terms associated with the services they choose to use.`,

      "Terms and Conditions": `The Terms and Conditions section defines the rules and guidelines that govern how users interact with the Placeme platform. Every online service establishes a set of terms that users agree to when creating accounts or accessing features.

These terms help maintain a safe, respectful, and productive environment for everyone in the community. They clarify what types of activities are permitted, what behavior is discouraged, and how disputes or violations may be handled.

For a platform like Placeme, the terms typically address several key areas. First, they outline the responsibilities of users. Students using the platform are expected to provide accurate information, avoid plagiarism in projects, and maintain respectful communication when interacting with mentors, recruiters, and other learners.

Second, the terms explain the responsibilities of the platform itself. Placeme commits to maintaining a functional learning environment, protecting user data, and continuously improving platform reliability and performance.

Third, the terms define intellectual property rights. Projects created by students generally belong to those students, while the platform's design, software, and content remain the property of the Placeme organization.

Another important aspect is acceptable use. Platforms must ensure that users do not misuse features for harmful activities such as spamming, harassment, unauthorized data scraping, or attempts to disrupt system functionality.

The terms may also explain limitations of liability. While Placeme aims to provide accurate learning resources and meaningful opportunities, career outcomes ultimately depend on individual effort, skill development, and external hiring decisions.

Additionally, the terms describe how updates to policies may occur. As technology evolves and the platform grows, rules may need adjustments. Users are typically informed when major policy changes happen.

In real production environments, Terms and Conditions documents are carefully reviewed by legal professionals to ensure compliance with applicable regulations and protection for both users and the organization.

This placeholder content demonstrates the type of information typically included in such agreements. The final version will provide a clear framework for responsible platform usage while protecting the rights and interests of everyone involved in the Placeme ecosystem.`
    };

    setDrawerContent({
      title,
      content: drawerTexts[title] || "Content coming soon."
    });

    setIsDrawerOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    document.body.style.overflow = "unset";
  };

  const footerLinks = [
    "About Us", 
    "Partner With Us", 
    "Contact Us", 
    "Privacy Policy", 
    "Refund Policy", 
    "Terms and Conditions"
  ];

  return (
    <>
      <footer className="bg-black text-white pt-20 pb-10 border-t border-gray-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-16 gap-10">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tracking-tight">PLACEME</span>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 text-gray-400 font-medium">
              {footerLinks.map((link) => (
                <button 
                  key={link}
                  onClick={() => openDrawer(link)}
                  className="hover:text-white transition-colors"
                >
                  {link}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8 gap-6 text-gray-500">
            <p>© 2026 Placeme. All Rights Reserved</p>
            
            <div className="flex items-center gap-6">
              <a href="#" className="hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Youtube size={20} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-20 overflow-hidden select-none opacity-10 flex justify-center">
          <span className="text-[15vw] font-black leading-none tracking-tighter">PLACEME</span>
        </div>
      </footer>

      {/* Bottom Drawer Overlay & Container */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Darkened Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Sliding Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.2)] max-h-[85vh] flex flex-col"
            >
              {/* Drawer Handle (Visual only) */}
              <div className="w-full flex justify-center pt-4 pb-2">
                <div className="w-12 h-1.5 bg-gray-300 rounded-full"></div>
              </div>

              <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex flex-col h-full min-h-[50vh] overflow-y-auto">
                {/* Drawer Header */}
                <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-900 font-serif italic">
                    {drawerContent.title}
                  </h3>
                  <button 
                    onClick={closeDrawer}
                    className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                {/* Drawer Content */}
                <div className="flex-1 text-gray-600">
                  <p className="text-base md:text-lg leading-relaxed">
                    {drawerContent.content}
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}