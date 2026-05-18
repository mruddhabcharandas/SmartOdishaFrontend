import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CONFIG } from '../../shared/lib/config.js'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'

export default function Home() {
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [offers, setOffers] = useState([])
  const [stores, setStores] = useState([])

  useEffect(() => {
    setSEO('SmartOdisha | Your One-Stop Shop in Odisha', 'Your one-stop destination for quality products at the best prices in Odisha.')
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "SmartOdisha",
      "url": window.location.origin,
      "logo": window.location.origin + "/logo.png",
      "description": "Your one-stop destination for quality products at the best prices in Odisha."
    })
    api.get('/api/public/categories').then(({ data }) => setCats(data || [])).catch(() => setCats([]))
    api.get('/api/brands', { params: { active: true } }).then(({ data }) => setBrands(data || [])).catch(() => setBrands([]))
    api.get('/api/offers?activeOnly=true').then(({ data }) => setOffers(data || [])).catch(() => setOffers([]))
    api.get('/api/public/stores').then(({ data }) => setStores(data || [])).catch(() => setStores([]))
  }, [])

  const displayCats = useMemo(() => {
    const defaultCats = [
      { name: 'Electronics', icon: '🎧' },
      { name: 'Fashion', icon: '👕' },
      { name: 'Home & Kitchen', icon: '🍳' },
      { name: 'Beauty', icon: '💄' },
      { name: 'Sports', icon: '🏏' },
      { name: 'Baby & Kids', icon: '🧸' }
    ]
    if (cats.length === 0) return defaultCats
    return cats.slice(0, 8).map(c => ({
      name: c.name,
      icon: c.image ? null : '📦',
      image: c.image
    }))
  }, [cats])

  const tickerLoop = useMemo(() => {
    const neutral = [
      { key: 'n1', label: 'Free Delivery on Select Products', pill: 'Free' },
      { key: 'n2', label: 'Easy Returns Available', pill: 'Hassle-free' },
      { key: 'n3', label: '100% Secure Payments', pill: 'Trusted' },
      { key: 'n4', label: 'Fast Delivery Across Odisha', pill: 'SmartOdisha' }
    ]
    return [...neutral, ...neutral]
  }, [])

  return (
    <div className="home-root bg-gray-50 min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; }
        
        .home-root {
          font-family: 'DM Sans', sans-serif;
          background: #f3f4f6;
          color: #1f2937;
        }

        .top-ticker {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
          color: white;
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .top-ticker { justify-content: center; text-align: center; }
        }
        .ticker-right { display: flex; gap: 16px; }
        .ticker-link { color: white; text-decoration: none; font-weight: 600; }
        .ticker-link:hover { text-decoration: underline; }

        .hero {
          background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 60%, #0f172a 100%);
          color: white;
          padding: 48px 20px 60px;
          position: relative;
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
        }
        @media (min-width: 1024px) {
          .hero-inner {
            grid-template-columns: 1fr 1fr;
            padding: 24px 0;
          }
        }
        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .hero-title {
          font-size: 36px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        @media (min-width: 768px) { .hero-title { font-size: 48px; } }
        .hero-title .accent { color: #f97316; }
        .hero-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #cbd5e1;
          max-width: 400px;
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #f97316, #ea580c, #f97316);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 
            0 8px 30px rgba(249,115,22,0.4),
            0 2px 10px rgba(249,115,22,0.2);
          transition: all 0.3s ease;
          animation: gradient-shift 4s ease infinite;
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 
            0 16px 40px rgba(249,115,22,0.5),
            0 4px 16px rgba(249,115,22,0.25);
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: white;
          border: 1px solid rgba(255,255,255,0.25);
          padding: 14px 26px;
          border-radius: 16px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .hero-image {
          max-width: 100%;
          height: auto;
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.35);
        }

        .features {
          max-width: 1280px;
          margin: 0 auto;
          padding: 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .features {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
          }
        }
        .feature-card {
          background: white;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }
        @media (max-width: 480px) {
          .feature-card { flex-direction: column; text-align: center; }
        }
        .feature-icon {
          width: 40px;
          height: 40px;
          background: #eff6ff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }
        .feature-text h4 {
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
        .feature-text p {
          font-size: 11px;
          color: #6b7280;
          margin: 4px 0 0 0;
        }

        .section-title {
          max-width: 1280px;
          margin: 40px auto 20px;
          padding: 0 20px;
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
        }

        .categories {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px 32px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px) {
          .categories { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .categories { grid-template-columns: repeat(6, 1fr); }
        }
        .category-card {
          background: white;
          border-radius: 16px;
          padding: 20px 12px;
          text-align: center;
          cursor: pointer;
          text-decoration: none;
          color: #1e293b;
          transition: all 0.2s;
          box-shadow: 0 2px 10px rgba(0,0,0,0.04);
        }
        .category-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .category-icon {
          font-size: 32px;
          margin-bottom: 10px;
        }
        .category-name {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .offers {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px 40px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) { .offers { grid-template-columns: repeat(2, 1fr); } }
        .offer-card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #dbeafe, #fed7aa);
          box-shadow: 0 8px 24px rgba(30,58,138,0.15);
        }
        .offer-content {
          position: absolute;
          inset: 0;
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: linear-gradient(to right, rgba(15,23,42,0.85), rgba(15,23,42,0.45), transparent);
          color: white;
        }
        .offer-tag {
          display: inline-flex;
          background: #f97316;
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          width: fit-content;
          margin-bottom: 12px;
        }
        .offer-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }
        .offer-btn {
          width: fit-content;
          margin-top: 20px;
          background: white;
          color: #1e293b;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }
        .offer-btn:hover {
          background: #f97316;
          color: white;
        }

        .brands {
          background: white;
          padding: 40px 20px;
          margin: 20px 0;
        }
        .brands-inner {
          max-width: 1280px;
          margin: 0 auto;
        }
        .brands-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .brands-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1024px) {
          .brands-grid { grid-template-columns: repeat(6, 1fr); }
        }
        .brand-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #374151;
          font-weight: 700;
          font-size: 13px;
          transition: all 0.2s;
          aspect-ratio: 1;
        }
        .brand-card:hover {
          background: white;
          border-color: #1e3a8a;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(30,58,138,0.1);
        }
        .brand-card img {
          max-width: 80%;
          max-height: 60px;
          object-fit: contain;
        }

        .stats {
          background: linear-gradient(135deg, #1e3a8a, #0f172a);
          color: white;
          padding: 40px 20px;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        @media (min-width: 768px) {
          .stats-inner { grid-template-columns: repeat(4, 1fr); }
        }
        .stat-item { text-align: center; }
        .stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 40px;
          line-height: 1;
          margin-bottom: 6px;
        }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        .ticker {
          background: linear-gradient(135deg, #1e3a8a, #f97316);
          padding: 10px 0;
          overflow: hidden;
        }
        .ticker-inner {
          display: flex;
          width: fit-content;
          animation: ticker 30s linear infinite;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 40px;
          color: white;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          white-space: nowrap;
        }
        .ticker-highlight {
          background: white;
          color: #1e3a8a;
          padding: 3px 12px;
          border-radius: 6px;
        }
      `}</style>

      {/* Top Ticker */}
      <div className="top-ticker">
        <span>📦 Free Delivery on Select Products</span>
        <div className="ticker-right">
          <a href="/orders" className="ticker-link">Track Order</a>
          <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="ticker-link">Help Center</a>
          <a href="/" className="ticker-link">Sell on SmartOdisha</a>
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <h1 className="hero-title">
              Smart Choice,<br /><span className="accent">Smart Life</span>
            </h1>
            <p className="hero-desc">
              Your one-stop destination for quality products at the best prices. Shop smart, live smart!
            </p>
            <div className="hero-cta">
              <Link to="/products" className="btn-primary">
                Shop Now
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/products" className="btn-secondary">
                Browse Catalogue
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <img
              src="https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1000&q=80"
              alt="Shopping"
              className="hero-image"
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">🚚</div>
          <div className="feature-text">
            <h4>Free Delivery</h4>
            <p>On select products</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔄</div>
          <div className="feature-text">
            <h4>Easy Returns</h4>
            <p>Easy return policy</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <div className="feature-text">
            <h4>Secure Payments</h4>
            <p>100% secure payments</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <div className="feature-text">
            <h4>Best Prices</h4>
            <p>Guaranteed best prices</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      <h2 className="section-title">Shop by Category</h2>
      <section className="categories">
        {displayCats.map((cat, i) => (
          <Link
            key={i}
            to="/products"
            className="category-card"
          >
            {cat.image ? (
              <img
                src={getCloudinaryUrl(cat.image, 80)}
                alt={cat.name}
                style={{ maxWidth: 60, maxHeight: 60, objectFit: 'contain', marginBottom: 8 }}
              />
            ) : (
              <div className="category-icon">{cat.icon}</div>
            )}
            <div className="category-name">{cat.name}</div>
          </Link>
        ))}
      </section>

      {/* Popular Stores */}
      {stores.length > 0 && (
        <>
          <h2 className="section-title">Popular Stores</h2>
          <section className="categories">
            {stores.map((store, i) => (
              <Link
                key={store._id}
                to={`/products?store=${encodeURIComponent(store.name)}`}
                className="category-card"
              >
                <div className="category-icon">🏪</div>
                <div className="category-name">{store.name}</div>
              </Link>
            ))}
          </section>
        </>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <>
          <h2 className="section-title">🔥 Special Offers</h2>
          <section className="offers">
            {offers.map((offer, i) => (
              <div key={i} className="offer-card">
                {offer.bannerImage && (
                  <img
                    src={getCloudinaryUrl(offer.bannerImage, 800)}
                    alt={offer.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  />
                )}
                <div className="offer-content">
                  {offer.discountPercent && (
                    <div className="offer-tag">{offer.discountPercent}% OFF</div>
                  )}
                  <h3 className="offer-title">{offer.title || 'Amazing Deal'}</h3>
                  <Link to="/products" className="offer-btn">Shop Now</Link>
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* Ticker */}
      <div className="ticker">
        <div className="ticker-inner">
          {tickerLoop.map((item, i) => (
            <div key={`${item.key}-${i}`} className="ticker-item">
              <span>✦</span>
              <span>{item.label}</span>
              <span className="ticker-highlight">{item.pill}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <section className="brands">
          <div className="brands-inner">
            <h2 className="section-title" style={{ marginTop: 0, marginBottom: 24, padding: 0 }}>
              Trusted Brands
            </h2>
            <div className="brands-grid">
              {brands.map((b, i) => (
                <Link
                  key={i}
                  to={`/brand/${b.slug || b._id}`}
                  className="brand-card"
                >
                  {b.logo ? (
                    <img src={getCloudinaryUrl(b.logo, 100)} alt={b.name} loading="lazy" />
                  ) : (
                    <span>{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="stats">
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-num">10K+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">500+</div>
            <div className="stat-label">Products</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">50+</div>
            <div className="stat-label">Brands</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Support</div>
          </div>
        </div>
      </section>

      {/* Footer - only on Home */}
      <footer className="bg-gradient-to-br from-slate-50 via-white to-blue-50 border-t border-slate-200 py-12 lg:py-16">
        <style>{`
          .footer-wave {
            background-image: 
              radial-gradient(circle at top, rgba(30,58,138,0.06) 0, transparent 55%),
              radial-gradient(circle at bottom right, rgba(249,115,22,0.06) 0, transparent 50%);
          }
        `}</style>
        <div className="footer-wave max-w-7xl mx-auto px-4 sm:px-6 md:px-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center lg:items-start gap-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 sm:h-18 sm:w-18 rounded-2xl bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-100">
                  <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-black tracking-tighter leading-none">
                    <span className="text-blue-700">SMART</span>
                    <span className="text-orange-500">ODISHA</span>
                  </span>
                  <span className="text-sm font-bold text-gray-500 tracking-widest mt-1.5">SMART CHOICE, SMART LIFE</span>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-3">© {new Date().getFullYear()} SmartOdisha</span>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping absolute"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold text-green-700 uppercase tracking-widest ml-1">Store Status: Online</span>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-6">
              <div className="flex flex-wrap justify-center lg:justify-end gap-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-pink-200 hover:bg-gradient-to-br hover:from-pink-50 hover:to-purple-50 transition-all duration-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="5" stroke="#E4405F" strokeWidth="2"/>
                    <circle cx="12" cy="12" r="4" stroke="#E4405F" strokeWidth="2"/>
                    <circle cx="18" cy="6" r="1" fill="#E4405F"/>
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50 transition-all duration-300"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-end gap-4">
                <a
                  href={`mailto:${CONFIG.SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-slate-300 hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50 transition-all duration-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                    <polyline points="22,6 12,13 2,6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Mail Us
                </a>
                <a
                  href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-700 hover:shadow-xl hover:-translate-y-0.5 hover:border-green-200 hover:bg-green-50 transition-all duration-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Message Us
                </a>
              </div>
              <div className="flex flex-col sm:flex-row gap-5 sm:gap-8 w-full sm:w-auto">
                <Link to="/privacy-policy" className="text-sm font-bold text-slate-600 uppercase tracking-widest hover:text-blue-600 transition-all hover:underline-offset-8 hover:underline transition-colors text-center sm:text-right">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="text-sm font-bold text-slate-600 uppercase tracking-widest hover:text-orange-500 transition-all hover:underline-offset-8 hover:underline transition-colors text-center sm:text-right">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
