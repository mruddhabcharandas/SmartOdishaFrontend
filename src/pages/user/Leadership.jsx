import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import { CONFIG } from '../../shared/lib/config.js'

export default function Leadership() {
  useEffect(() => {
    setSEO(
      'Leadership & Management | SmartOdisha',
      'Meet the leadership team behind SmartOdisha B2C Marketplace. Managed and operated by Tapan Kumar Das and Uddhab Charan Das.'
    )
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "SmartOdisha Leadership & Governance",
      "url": window.location.origin + "/leadership",
      "description": "Information on SmartOdisha B2C Marketplace model and leadership management team."
    })
  }, [])

  return (
    <div className="leadership-page min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .leadership-page { font-family: 'Inter', sans-serif; }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .floating { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* Hero Header */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl floating"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl floating" style={{ animationDelay: '3s' }}></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-8 shadow-xl">
            <span className="text-xl">🏛️</span>
            <span className="text-xs font-black uppercase tracking-widest text-blue-200">Leadership & Platform Governance</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 leading-tight">
            Driving Odisha's Digital <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent">B2C Commerce</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            SmartOdisha is built and operated by passionate individuals dedicated to creating a seamless, transparent, and trusted multi-vendor B2C shopping experience for every consumer across Odisha.
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* About SmartOdisha B2C Model */}
        <section className="p-8 sm:p-12 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest mb-6">
            Our Business Model
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4 tracking-tight">
            About SmartOdisha (B2C Marketplace)
          </h2>
          <div className="space-y-4 text-slate-700 text-base sm:text-lg leading-relaxed font-normal">
            <p>
              <strong>SmartOdisha</strong> is an online <strong>Business-to-Consumer (B2C)</strong> e-commerce ecosystem designed to connect trusted local stores, verified merchants, and artisans with retail customers across Odisha.
            </p>
            <p>
              By eliminating intermediary overheads, SmartOdisha empowers consumers with high-quality local products, direct pricing, secured online and Cash on Delivery (COD) payment systems, and dependable doorstep delivery across urban and rural locations.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 mt-8 pt-8 border-t border-slate-100">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-2xl mb-2">🛍️</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Direct Retail (B2C)</h3>
              <p className="text-xs text-slate-600 mt-1">Connecting verified businesses directly with shoppers for authentic quality.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Localized Delivery</h3>
              <p className="text-xs text-slate-600 mt-1">Optimized statewide logistics ensuring fast fulfillment across all districts.</p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="text-2xl mb-2">🛡️</div>
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Buyer Protection</h3>
              <p className="text-xs text-slate-600 mt-1">100% encrypted transactions, easy return policies, and dedicated resolution.</p>
            </div>
          </div>
        </section>

        {/* Leadership Profiles */}
        <section className="mb-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest mb-3">
              Platform Leadership
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Managed & Operated By
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Meet the key leadership team directing platform operations, strategy, and technology.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Tapan Kumar Das */}
            <div className="p-8 sm:p-10 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-indigo-100/80 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
                    T
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Tapan Kumar Das</h3>
                    <p className="text-xs font-black uppercase tracking-wider text-indigo-600 mt-0.5">
                      Business Operations & Management
                    </p>
                  </div>
                </div>
                
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  Tapan manages the end-to-end commercial operations, seller partner onboarding, logistics network management, order fulfillment, and customer satisfaction across SmartOdisha.
                </p>

                <div className="space-y-2.5 text-xs text-slate-700 font-semibold bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/60">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Merchant & Store Relations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Logistics & Fulfillment Operations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    <span>Customer Support & Dispute Resolution</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Role</span>
                <span className="text-xs font-black text-indigo-900 bg-indigo-100 px-3 py-1 rounded-lg">Operations Lead</span>
              </div>
            </div>

            {/* Uddhab Charan Das */}
            <div className="p-8 sm:p-10 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-blue-100/80 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
                    U
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">Uddhab Charan Das</h3>
                    <p className="text-xs font-black uppercase tracking-wider text-blue-600 mt-0.5">
                      Software Engineering & Technology
                    </p>
                  </div>
                </div>
                
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  Uddhab leads the engineering, digital architecture, software development, cloud infrastructure, payment integrations, security protocols, and platform innovation for SmartOdisha.
                </p>

                <div className="space-y-2.5 text-xs text-slate-700 font-semibold bg-blue-50/50 p-4 rounded-2xl border border-blue-100/60">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Full-Stack Platform & App Architecture</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Payment Gateway & Security Systems</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    <span>Database Management & Cloud Infra</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Executive Role</span>
                <span className="text-xs font-black text-blue-900 bg-blue-100 px-3 py-1 rounded-lg">Technical Lead</span>
              </div>
            </div>

          </div>
        </section>

        {/* Contact & Inquiries Card */}
        <section className="p-8 sm:p-10 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black mb-3 tracking-tight">
              Official Contact & Inquiries
            </h2>
            <p className="text-slate-300 text-sm sm:text-base mb-6 leading-relaxed">
              For business partnerships, platform inquiries, or executive communication, please reach out to our team directly:
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="mailto:tapantapanki11@gmail.com"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm hover:bg-blue-50 transition-all shadow-md"
              >
                <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>tapantapanki11@gmail.com</span>
              </a>

              <a
                href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-md border border-white/20 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.646.917 5.082 2.477 7.053L0 24l5.247-1.342C7.317 23.678 9.585 24 12 24c6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>WhatsApp: {CONFIG.SUPPORT_PHONE_DISPLAY}</span>
              </a>
            </div>
          </div>
        </section>

      </main>
    </div>
  )
}
