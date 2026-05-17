import React from 'react'

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-20 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter mb-8">
        Terms of <span className="text-orange-500">Service</span>
      </h1>
      <div className="prose max-w-none text-gray-600 leading-relaxed">
        <p className="mb-6 font-bold text-gray-900">Last updated: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        
        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">By accessing or using the SmartOdisha platform, you agree to be bound by these terms of service.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">2. Account Verification</h2>
          <p className="mb-4">To place orders, users may need to complete the verification process by providing valid identification and address details. We reserve the right to verify and approve accounts.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">3. Payment Terms</h2>
          <p className="mb-4">We accept payments through secure online gateways, UPI, and bank transfers. All orders are subject to approval and payment verification.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">4. Shipping and Delivery</h2>
          <p className="mb-4">We ship through third-party logistics partners. Delivery timelines are estimates and may vary based on your location and serviceability.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">5. Returns and Refunds</h2>
          <p className="mb-4">Returns are available for eligible products. Please contact our support team for more details.</p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase tracking-widest text-gray-900 mb-4">6. Limitation of Liability</h2>
          <p className="mb-4">SmartOdisha is not liable for any indirect, incidental, or consequential damages resulting from the use of our services or products.</p>
        </section>
      </div>
    </div>
  )
}
