import React, { useState } from "react";

export function TermsAndConditions() {
  const [activeSegment, setActiveSegment] = useState("acceptance");

  return (
    <div className="bg-[#0a0a0a] text-gray-100 min-h-screen antialiased relative overflow-x-hidden font-sans">
      
      {/* Glowing Background Effects */}
      <div className="absolute rounded-full filter blur-[80px] -z-10 opacity-20 pointer-events-none bg-[#0f766e] w-[600px] h-[600px] top-[-200px] left-[50%] -translate-x-1/2" />

      <main className="pt-32 pb-24 px-6 relative z-10 max-w-7xl mx-auto min-h-screen">
        
        <div className="mb-16 text-center animate-slide-up">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-6">
            Last Updated: October 15, 2025
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Terms and Conditions
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Please read these terms and conditions carefully before using Our Service. These terms apply to all users, visitors and others who access or use the Service.
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-12 items-start animate-slide-up">
          
          {/* Table of Contents Sidebar */}
          <aside className="md:col-span-1 sticky top-32 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 hidden md:block">
            <h4 className="text-xs font-bold uppercase tracking-widest text-teal-500 mb-4">On this page</h4>
            <nav className="flex flex-col space-y-3 text-sm">
              <a 
                href="#acceptance" 
                onClick={() => setActiveSegment("acceptance")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "acceptance" ? "text-teal-500 border-teal-500 bg-gradient-to-r from-teal-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                1. Acceptance of Terms
              </a>
              <a 
                href="#license" 
                onClick={() => setActiveSegment("license")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "license" ? "text-teal-500 border-teal-500 bg-gradient-to-r from-teal-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                2. License to Use
              </a>
              <a 
                href="#restrictions" 
                onClick={() => setActiveSegment("restrictions")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "restrictions" ? "text-teal-500 border-teal-500 bg-gradient-to-r from-teal-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                3. Restrictions
              </a>
              <a 
                href="#data" 
                onClick={() => setActiveSegment("data")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "data" ? "text-teal-500 border-teal-500 bg-gradient-to-r from-teal-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                4. Data Processing
              </a>
              <a 
                href="#liability" 
                onClick={() => setActiveSegment("liability")}
                className={`pl-3 transition-all duration-200 border-l-2 ${activeSegment === "liability" ? "text-teal-500 border-teal-500 bg-gradient-to-r from-teal-500/10 to-transparent" : "text-gray-400 border-transparent hover:text-white hover:border-white/10"}`}
              >
                5. Limitation of Liability
              </a>
            </nav>
          </aside>

          {/* Content */}
          <article className="md:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-12">
            
            <h2 id="acceptance" className="text-white text-2xl font-semibold mb-4 mt-0">1. Acceptance of Terms</h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              By accessing or using the Deepdale AI platform, API, or any related services, you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.
            </p>

            <h2 id="license" className="text-white text-2xl font-semibold mb-4 mt-8">2. License to Use</h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Deepdale AI grants you a revocable, non-exclusive, non-transferable, limited license to download, install and use the platform strictly in accordance with the terms of this Agreement.
            </p>

            <h2 id="restrictions" className="text-white text-2xl font-semibold mb-4 mt-8">3. Restrictions</h2>
            <p className="text-gray-400 leading-relaxed mb-3">You agree not to, and you will not permit others to:</p>
            <ul className="text-gray-400 leading-relaxed list-disc pl-6 mb-8 space-y-2">
              <li>License, sell, rent, lease, assign, distribute, transmit, host, outsource, disclose or otherwise commercially exploit the service.</li>
              <li>Modify, make derivative works of, disassemble, decrypt, reverse compile or reverse engineer any part of the platform.</li>
              <li>Remove, alter or obscure any proprietary notice (including any notice of copyright or trademark) of Deepdale AI or its affiliates, partners, suppliers or the licensors of the application.</li>
            </ul>

            <h2 id="data" className="text-white text-2xl font-semibold mb-4 mt-8">4. Data Processing</h2>
            <p className="text-gray-400 leading-relaxed mb-8">
              Any user data uploaded to Deepdale AI will be processed in accordance with our Privacy Policy. By utilizing our AI engine, you consent to our automated data processing models, which are completely anonymized to ensure enterprise compliance.
            </p>
            
            <h2 id="liability" className="text-white text-2xl font-semibold mb-4 mt-8">5. Limitation of Liability</h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              Notwithstanding any damages that You might incur, the entire liability of the Company and any of its suppliers under any provision of this Terms and Your exclusive remedy for all of the foregoing shall be limited to the amount actually paid by You through the Service or 100 USD if You haven't purchased anything through the Service.
            </p>
            <p className="text-gray-400 leading-relaxed mb-8">
              To the maximum extent permitted by applicable law, in no event shall the Company or its suppliers be liable for any special, incidental, indirect, or consequential damages whatsoever (including, but not limited to, damages for loss of profits, loss of data or other information, for business interruption, for personal injury, loss of privacy arising out of or in any way related to the use of or inability to use the Service).
            </p>
          </article>

        </div>
      </main>

    </div>
  );
}
