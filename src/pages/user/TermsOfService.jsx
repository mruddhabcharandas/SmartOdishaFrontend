import React from 'react'

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20 font-sans">
      <h1 className="text-4xl font-black uppercase tracking-tighter mb-8">Terms of <span className="text-indigo-600">Service</span></h1>
      <div className="prose prose-indigo max-w-none text-gray-600 leading-relaxed">
        <p className="mb-6 font-bold text-gray-900">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">By accessing or using the Click2Kart platform, you agree to be bound by these terms of service. This platform is exclusively for B2B wholesale transactions.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">2. KYC Verification</h2>
          <p className="mb-4">To place orders, users must complete the KYC process by providing a valid GSTIN, PAN, and business address. We reserve the right to verify and approve accounts.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">3. Minimum Order Requirements</h2>
          <p className="mb-4">Our platform has a minimum order amount policy (currently ₹5,000) for all B2B wholesale orders. Bulk discounts are applied automatically based on quantities.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">4. Payment Terms</h2>
          <p className="mb-4">We accept payments through Razorpay (Online), Manual (UPI/Bank), and COD (20% Advance). All orders are subject to approval and payment verification.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">5. Shipping and Delivery</h2>
          <p className="mb-4">We ship through third-party logistics partners. Delivery timelines are estimates and may vary based on your location and serviceability.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">Click2Kart is not liable for any indirect, incidental, or consequential damages resulting from the use of our services or products.</p>
        </section>
      </div>
    </div>
  )
}
