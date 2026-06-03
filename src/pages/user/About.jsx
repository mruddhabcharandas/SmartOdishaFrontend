import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'

export default function About() {
  useEffect(() => {
    setSEO('About SmartOdisha | How It Works', 'Learn how SmartOdisha works - from browsing products to placing orders and making secure payments.')
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About SmartOdisha",
      "url": window.location.origin + "/about"
    })
  }, [])

  const sections = [
    {
      id: 'browse',
      title: 'Step 1: Browse Products',
      icon: '🛍️',
      description: 'Explore thousands of products from trusted local stores across Odisha. Filter by category, brand, price, and more to find exactly what you need.',
      features: ['Browse by categories', 'Filter and sort', 'View product details']
    },
    {
      id: 'cart',
      title: 'Step 2: Add to Cart',
      icon: '🛒',
      description: 'Once you find the perfect products, simply add them to your cart. You can continue shopping or proceed to checkout.',
      features: ['Add multiple items', 'Update quantities', 'Save for later']
    },
    {
      id: 'checkout',
      title: 'Step 3: Checkout',
      icon: '📝',
      description: 'Enter your delivery details or choose from your saved addresses. Select your preferred delivery option and proceed to payment.',
      features: ['Saved addresses', 'Delivery options', 'Secure checkout']
    },
    {
      id: 'payment',
      title: 'Step 4: Payment',
      icon: '💳',
      description: 'Make secure payments using Cashfree. We accept UPI, debit/credit cards, net banking, and wallets for your convenience.',
      features: ['Cashfree secure', 'Multiple payment options', '100% safe']
    },
    {
      id: 'delivery',
      title: 'Step 5: Delivery',
      icon: '🚚',
      description: 'Sit back and relax! Your order will be delivered to your doorstep. Track your order anytime from your account.',
      features: ['Fast delivery', 'Order tracking', 'Support 24/7']
    }
  ]

  return (
    <div className="about-page min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        .about-page { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Hero */}
      <section className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/10 backdrop-blur border border-white/20 mb-8">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-bold uppercase tracking-widest">How It Works</span>
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">
            Shop Smart, Live Better with <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">SmartOdisha</span>
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Your one-stop destination for quality products from trusted local stores across Odisha. Here's how it all works.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8">
            {sections.map((section, index) => (
              <div 
                key={section.id} 
                className={`p-8 sm:p-12 rounded-3xl bg-white shadow-2xl shadow-slate-200/50 border border-slate-100 transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="grid md:grid-cols-2 gap-10 items-center">
                  <div className="flex justify-center">
                    <div className="w-48 h-48 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-7xl shadow-2xl shadow-blue-300/50">
                      {section.icon}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                        {index + 1}
                      </span>
                      <h3 className="text-3xl font-black text-slate-900">{section.title}</h3>
                    </div>
                    <p className="text-slate-600 text-lg mb-6 leading-relaxed">
                      {section.description}
                    </p>
                    <ul className="space-y-3">
                      {section.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                            ✓
                          </div>
                          <span className="text-slate-700 font-semibold">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4">Why Choose SmartOdisha?</h2>
            <p className="text-xl text-slate-600">Experience the best of local shopping with modern convenience</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🏪', title: 'Local Stores', desc: 'Shop from trusted local stores near you' },
              { icon: '🚚', title: 'Fast Delivery', desc: 'Quick delivery across Odisha' },
              { icon: '🔒', title: 'Secure Payments', desc: '100% secure transactions' },
              { icon: '↩️', title: 'Easy Returns', desc: 'Hassle-free return policy' }
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300">
                <div className="text-5xl mb-6">{item.icon}</div>
                <h4 className="text-2xl font-black text-slate-900 mb-3">{item.title}</h4>
                <p className="text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-6">Ready to Start Shopping?</h2>
          <p className="text-xl text-blue-100 mb-10">Discover amazing products from local stores across Odisha</p>
          <Link 
            to="/products" 
            className="inline-flex items-center gap-4 px-10 py-5 bg-white text-blue-600 rounded-2xl font-black text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Shop Now
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
