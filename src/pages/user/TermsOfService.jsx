import React, { useEffect } from 'react'
import { setSEO } from '../../shared/lib/seo.js'

export default function TermsOfService() {
  useEffect(() => {
    setSEO('Terms of Service | SmartOdisha', 'Read our Terms of Service to understand your rights and responsibilities when using SmartOdisha.')
  }, [])

  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      content: 'By accessing or using the SmartOdisha platform, you agree to be bound by these terms of service. If you do not agree, please do not use our services.'
    },
    {
      id: 'account',
      title: '2. Account Verification',
      content: 'To place orders, users may need to complete the verification process by providing valid identification and address details. We reserve the right to verify and approve accounts. You are responsible for maintaining the security of your account credentials.'
    },
    {
      id: 'payment',
      title: '3. Payment Terms',
      content: 'We accept payments through secure online gateways including Cashfree, UPI, debit/credit cards, net banking, and bank transfers. All orders are subject to approval and payment verification. Prices are subject to change without notice.'
    },
    {
      id: 'shipping',
      title: '4. Shipping and Delivery',
      content: 'We ship through third-party logistics partners. Delivery timelines are estimates and may vary based on your location and serviceability. We are not responsible for delays caused by logistics partners or unforeseen circumstances.'
    },
    {
      id: 'returns',
      title: '5. Returns and Refunds',
      content: 'Returns are available for eligible products within 7 days of delivery. Products must be unused and in original packaging. Refunds will be processed within 7-10 business days after receiving the returned product. Please contact our support team for assistance with returns.'
    },
    {
      id: 'liability',
      title: '6. Limitation of Liability',
      content: 'SmartOdisha is not liable for any indirect, incidental, or consequential damages resulting from the use of our services or products. Our total liability is limited to the amount you paid for the product or service in question.'
    },
    {
      id: 'changes',
      title: '7. Changes to Terms',
      content: 'We reserve the right to modify these terms at any time. Any changes will be effective immediately upon posting. Your continued use of the platform constitutes acceptance of the modified terms.'
    }
  ]

  return (
    <div className="terms-page min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .terms-page { font-family: 'Inter', sans-serif; }
      `}</style>
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent mb-6">
            Terms of Service
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
