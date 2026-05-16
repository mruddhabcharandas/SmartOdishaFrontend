import React from 'react'

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 font-sans">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Privacy <span className="text-indigo-600">Policy</span></h1>
      <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed">
        <p className="mb-6 font-bold text-gray-900">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">1. Information We Collect</h2>
          <p className="mb-4">At Click2Kart, we collect business information necessary to facilitate B2B transactions. This includes your business name, GSTIN, PAN, contact details, and shipping address.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">2. How We Use Your Data</h2>
          <p className="mb-4">Your information is used to verify your business identity (KYC), process orders, calculate applicable taxes (GST), and arrange delivery through our logistics partners.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">3. Data Security</h2>
          <p className="mb-4">We implement industry-standard security measures to protect your sensitive business data. All payment transactions are processed through secure, encrypted gateways (Razorpay).</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">4. Third-Party Sharing</h2>
          <p className="mb-4">We only share necessary information with our logistics partners for delivery and with government authorities as required for tax compliance (GST filings).</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">5. Contact Us</h2>
          <p className="mb-4">If you have any questions regarding this privacy policy, you can contact our support team at support@click2kart.net .</p>
        </section>
      </div>
    </div>
  )
}
