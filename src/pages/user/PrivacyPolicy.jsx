import React, { useEffect } from 'react'
import { setSEO } from '../../shared/lib/seo.js'

export default function PrivacyPolicy() {
  useEffect(() => {
    setSEO('Privacy Policy | SmartOdisha', 'Learn how SmartOdisha collects, uses, and protects your personal information.')
  }, [])

  const sections = [
    {
      id: 'collect',
      title: '1. Information We Collect',
      content: 'At SmartOdisha, we collect information necessary to facilitate transactions. This includes your name, email address, phone number, shipping address, and payment details.'
    },
    {
      id: 'use',
      title: '2. How We Use Your Data',
      content: 'Your information is used to verify your identity, process orders, calculate applicable taxes, arrange delivery through our logistics partners, and provide customer support.'
    },
    {
      id: 'security',
      title: '3. Data Security',
      content: 'We implement industry-standard security measures to protect your sensitive data. All payment transactions are processed through secure, encrypted gateways (Cashfree). We do not store your complete credit/debit card information.'
    },
    {
      id: 'sharing',
      title: '4. Third-Party Sharing',
      content: 'We only share necessary information with our logistics partners for delivery purposes, payment processors for transaction processing, and government authorities as required for tax compliance.'
    },
    {
      id: 'cookies',
      title: '5. Cookies',
      content: 'We use cookies to enhance your browsing experience, remember your preferences, and analyze website traffic. You can control cookie settings through your browser.'
    },
    {
      id: 'contact',
      title: '6. Contact Us',
      content: 'If you have any questions regarding this privacy policy, you can contact our support team at support@smartodisha.in or call us at +91 98270 58262.'
    },
    {
      id: 'changes',
      title: '7. Changes to Policy',
      content: 'We reserve the right to update this privacy policy at any time. Any changes will be posted on this page. Your continued use of the platform constitutes acceptance of the updated policy.'
    }
  ]

  return (
    <div className="privacy-page min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .privacy-page { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-slate-600 font-semibold">
            Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} className="p-8 sm:p-10 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 tracking-tight">
                {section.title}
              </h2>
              <p className="text-lg text-slate-700 leading-relaxed">
                {section.content}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
