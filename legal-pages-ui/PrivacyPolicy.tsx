import React, { useState } from "react";

export function PrivacyPolicy() {
  const [activeSegment, setActiveSegment] = useState("information-collection");

  return (
    <div className="bg-[#0a0a0a] text-gray-100 min-h-screen antialiased relative overflow-x-hidden font-sans">
      
      {/* Glowing Background Effects */}
      <div className="absolute rounded-full filter blur-[80px] -z-10 opacity-15 pointer-events-none bg-[#d97706] w-[600px] h-[600px] top-[-200px] left-[50%] -translate-x-1/2" />

      <main className="pt-32 pb-24 px-6 relative z-10 max-w-7xl mx-auto min-h-screen">
        
        <div className="mb-16 text-center animate-slide-up">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
            Last Updated: October 15, 2025
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Privacy Policy
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Your privacy is important to us. This policy outlines how we collect, use, protect, and handle your data.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-12 items-start animate-slide-up">
          
          {/* Table of Contents Sidebar */}
          <aside className="md:col-span-1 sticky top-32 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hidden md:block">
            <h4 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4">On this page</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <a 
                href="#information-collection" 
                onClick={() => setActiveSegment("information-collection")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "information-collection" ? "text-amber-500 border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                1. Information Collection
              </a>
              <a 
                href="#information-use" 
                onClick={() => setActiveSegment("information-use")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "information-use" ? "text-amber-500 border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                2. How We Use Info
              </a>
              <a 
                href="#data-protection" 
                onClick={() => setActiveSegment("data-protection")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "data-protection" ? "text-amber-500 border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                3. Data Protection
              </a>
              <a 
                href="#cookies" 
                onClick={() => setActiveSegment("cookies")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "cookies" ? "text-amber-500 border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                4. Cookies
              </a>
              <a 
                href="#contact" 
                onClick={() => setActiveSegment("contact")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "contact" ? "text-amber-500 border-amber-500 bg-gradient-to-r from-amber-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                5. Contact Us
              </a>
            </nav>
          </aside>

          {/* Content */}
          <article className="md:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
            
            <h2 id="information-collection" className="text-white text-2xl font-semibold mb-4 mt-0">1. Information Collection</h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              We collect information from you when you register on our site, place an order, subscribe to a newsletter, respond to a survey, fill out a form, engage with our AI tools, or enter information on our site.
            </p>
            <p className="text-gray-400 leading-relaxed mb-3">
              Types of data collected may include:
            </p>
            <ul className="text-gray-400 leading-relaxed list-disc pl-6 mb-8 space-y-2">
              <li>Personal identification data (Name, email address, phone number).</li>
              <li>Usage data representing your interactions with our APIs.</li>
              <li>Audio and voice inputs that are explicitly shared for model processing.</li>
            </ul>

            <h2 id="information-use" className="text-white text-2xl font-semibold mb-4 mt-8">2. How We Use Your Information</h2>
            <p className="text-gray-400 leading-relaxed mb-3">
              We may use the information we collect from you in the following ways:
            </p>
            <ul className="text-gray-400 leading-relaxed list-disc pl-6 mb-8 space-y-2">
              <li>To personalize your experience and to allow us to deliver the type of content and product offerings in which you are most interested.</li>
              <li>To improve our website in order to better serve you.</li>
              <li>To securely train anonymized language models (only if explicitly opted-in).</li>
              <li>To quickly process your requests and transactions.</li>
            </ul>

            <h2 id="data-protection" className="text-white text-2xl font-semibold mb-4 mt-8">3. Data Protection</h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              We implement a variety of security measures when a user enters, submits, or accesses their information to maintain the safety of your personal information. All sensitive/credit information you supply is encrypted via Secure Socket Layer (SSL) technology.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              Your personal information is contained behind secured networks and is only accessible by a limited number of persons who have special access rights to such systems, and are required to keep the information confidential.
            </p>

            <h2 id="cookies" className="text-white text-2xl font-semibold mb-4 mt-8">4. Cookies</h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              We use cookies to help us remember and process the items in your cart, understand and save your preferences for future visits, and compile aggregate data about site traffic and site interaction so that we can offer better site experiences and tools in the future.
            </p>
            
            <h2 id="contact" className="text-white text-2xl font-semibold mb-4 mt-8">5. Contact Us</h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              If there are any questions regarding this privacy policy, you may contact us using the information below.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              <strong>Deepdale AI HQ</strong><br />
              One Market Street, Spear Tower, Suite 3600<br />
              San Francisco, CA 94105<br />
              Email: <a href="mailto:privacy@deepdale.ai" className="text-amber-500 hover:underline">privacy@deepdale.ai</a>
            </p>
          </article>

        </div>
      </main>

    </div>
  );
}
