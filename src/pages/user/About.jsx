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
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .floating { animation: float 6s ease-in-out infinite; }
        .gradient-bg {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>

      {/* Hero */}
      <section className="pt-32 pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden relative">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl floating"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl floating" style={{ animationDelay: '3s' }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 mb-10 shadow-2xl">
            <span className="text-3xl">✨</span>
            <span className="text-sm font-black uppercase tracking-widest">How It Works</span>
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black leading-tight mb-8">
            Shop Smart, Live Better with <span className="bg-gradient-to-r from-blue-300 via-indigo-300 to-purple-300 bg-clip-text text-transparent gradient-bg">SmartOdisha</span>
          </h1>
          <p className="text-xl sm:text-2xl lg:text-3xl text-slate-300 max-w-4xl mx-auto leading-relaxed font-medium">
            Your one-stop destination for quality products from trusted local stores across Odisha. Here's how it all works.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid gap-12">
            {sections.map((section, index) => (
              <div
                key={section.id}
                className="p-10 sm:p-16 rounded-[32px] bg-white shadow-2xl shadow-slate-300/40 border border-slate-100 transition-all duration-700 hover:shadow-[0_32px_64px_-12px_rgba(59,130,246,0.15)] hover:-translate-y-4"
              >
                <div className="grid md:grid-cols-2 gap-16 items-center">
                  <div className={`flex justify-center ${index % 2 === 1 ? 'md:order-2' : ''}`}>
                    <div className="w-56 h-56 rounded-[32px] bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-8xl shadow-2xl shadow-blue-400/50 relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
                      <span className="relative z-10">{section.icon}</span>
                    </div>
                  </div>
                  <div className={index % 2 === 1 ? 'md:order-1' : ''}>
                    <div className="flex items-center gap-4 mb-6">
                      <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-300/40">
                        {index + 1}
                      </span>
                      <h3 className="text-3xl sm:text-4xl font-black text-slate-900">{section.title}</h3>
                    </div>
                    <p className="text-slate-600 text-xl mb-8 leading-relaxed">
                      {section.description}
                    </p>
                    <ul className="space-y-4">
                      {section.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                            ✓
                          </div>
                          <span className="text-slate-800 font-bold text-lg">{feature}</span>
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-blue-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-6">Why Choose SmartOdisha?</h2>
            <p className="text-xl sm:text-2xl text-slate-600 font-medium">Experience the best of local shopping with modern convenience</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🏪', title: 'Local Stores', desc: 'Shop from trusted local stores near you' },
              { icon: '🚚', title: 'Fast Delivery', desc: 'Quick delivery across Odisha' },
              { icon: '🔒', title: 'Secure Payments', desc: '100% secure transactions' },
              { icon: '↩️', title: 'Easy Returns', desc: 'Hassle-free return policy' }
            ].map((item, i) => (
              <div key={i} className="p-10 rounded-[32px] bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 group">
                <div className="text-6xl mb-8 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <h4 className="text-2xl sm:text-3xl font-black text-slate-900 mb-4">{item.title}</h4>
                <p className="text-slate-600 text-lg font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl floating"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl floating" style={{ animationDelay: '3s' }}></div>
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-8">Ready to Start Shopping?</h2>
          <p className="text-xl sm:text-2xl text-blue-100 mb-12 font-medium">Discover amazing products from local stores across Odisha</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-6 px-12 py-6 bg-white text-blue-600 rounded-[24px] font-black text-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300"
          >
            Shop Now
            <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="font-bold">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  )
}
