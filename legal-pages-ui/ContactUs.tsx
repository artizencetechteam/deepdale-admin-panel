import React from "react";

export function ContactUs() {
  return (
    <div className="bg-[#0a0a0a] text-gray-100 min-h-screen antialiased relative overflow-x-hidden font-sans">
      
      {/* Glowing Background Effects */}
      <div className="absolute rounded-full filter blur-[80px] -z-10 opacity-40 pointer-events-none bg-[#0f766e] w-[500px] h-[500px] top-[-100px] left-[-200px]" />
      <div className="absolute rounded-full filter blur-[80px] -z-10 opacity-20 pointer-events-none bg-[#d97706] w-[400px] h-[400px] top-[20%] right-[-100px]" />
      <div className="absolute rounded-full filter blur-[80px] -z-10 opacity-30 pointer-events-none bg-[#0f766e] w-[600px] h-[600px] bottom-[-200px] left-[20%]" />

      <main className="pt-32 pb-24 px-6 relative z-10 max-w-7xl mx-auto min-h-[calc(100vh-80px)] flex flex-col justify-center">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
          <div className="inline-flex items-center rounded-full border border-teal-500/30 bg-teal-700/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-teal-500 mb-6">
            Get in touch
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-200 to-gray-500">
            Let's build the future together.
          </h1>
          <p className="text-xl text-gray-400">
            Have questions about our enterprise AI solutions? Our team is available and ready to help you transform your business.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-8 items-start">
          
          {/* Contact Form */}
          <div className="lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 md:p-10 animate-slide-up hover:bg-white/10 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_20px_40px_-20px_rgba(20,184,166,0.15)] transition-all duration-300">
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">First Name</label>
                  <input type="text" className="bg-black/20 border border-white/10 text-white w-full rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-black/40 transition-all" placeholder="Jane" required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Last Name</label>
                  <input type="text" className="bg-black/20 border border-white/10 text-white w-full rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-black/40 transition-all" placeholder="Doe" required />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Work Email</label>
                <input type="email" className="bg-black/20 border border-white/10 text-white w-full rounded-xl px-4 py-3 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-black/40 transition-all" placeholder="jane@company.com" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">How can we help?</label>
                <textarea rows={4} className="bg-black/20 border border-white/10 text-white w-full rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 focus:bg-black/40 transition-all" placeholder="Tell us about your project or needs..." required></textarea>
              </div>

              <button type="submit" className="w-full rounded-xl bg-gradient-to-r from-teal-700 to-teal-500 hover:from-teal-500 hover:to-teal-700 text-white font-semibold py-4 px-6 transition-all duration-300 shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transform hover:-translate-y-1">
                Send Message
              </button>
              
              <p className="text-xs text-center text-gray-500 mt-4">
                By submitting this form, you agree to our <a href="/privacy" className="text-teal-500 hover:underline">Privacy Policy</a>.
              </p>
            </form>
          </div>

          {/* Contact Info Cards */}
          <div className="lg:col-span-2 flex flex-col gap-6 animate-slide-up">
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex gap-5 items-start cursor-pointer hover:border-teal-500/50 hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-full bg-teal-700/20 flex items-center justify-center shrink-0 border border-teal-700/30">
                <svg className="w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Email Support</h3>
                <p className="text-gray-400 text-sm mb-2">Our team usually replies within 24 hours.</p>
                <a href="mailto:support@deepdale.ai" className="text-teal-500 font-medium hover:underline">support@deepdale.ai</a>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex gap-5 items-start cursor-pointer hover:border-amber-600/50 hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-full bg-amber-600/20 flex items-center justify-center shrink-0 border border-amber-600/30">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Sales</h3>
                <p className="text-gray-400 text-sm mb-2">Talk to our enterprise sales team regarding large scale deployments.</p>
                <a href="tel:+18005550199" className="text-amber-500 font-medium hover:underline">+1 (800) 555-0199</a>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex gap-5 items-start cursor-pointer hover:border-white/20 hover:-translate-y-1 transition duration-300">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.243-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">HQ Location</h3>
                <p className="text-gray-400 text-sm">
                  One Market Street<br />
                  Spear Tower, Suite 3600<br />
                  San Francisco, CA 94105
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
