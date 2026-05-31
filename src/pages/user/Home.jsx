import React, { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CONFIG } from '../../shared/lib/config.js'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'

export default function Home() {
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
    api.get('/api/offers?activeOnly=true').then(({ data }) => setOffers(data || [])).catch(() => setOffers([]))
    api.get('/api/public/stores').then(({ data }) => setStores(data || [])).catch(() => setStores([]))
  }, [])

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        
        .home-root {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 25%, #f8fafc 25%, #f8fafc 100%);
          color: #0f172a;
        }

        .top-ticker {
          background: linear-gradient(90deg, #1d4ed8 0%, #3b82f6 50%, #8b5cf6 100%);
          color: white;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }
        @media (max-width: 640px) {
          .top-ticker { justify-content: center; text-align: center; gap: 8px; }
        }
        .ticker-right { display: flex; gap: 16px; }
        .ticker-link { color: white; text-decoration: none; font-weight: 700; transition: all 0.2s; padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,0.1); }
        .ticker-link:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }

        .hero {
          color: white;
          padding: 80px 20px 100px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(236, 72, 153, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 40px;
          align-items: center;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 1024px) {
          .hero-inner {
            grid-template-columns: 1.2fr 1fr;
            gap: 60px;
          }
        }
        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          width: fit-content;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.2);
        }
        .hero-title {
          font-size: clamp(36px, 8vw, 72px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .hero-title .accent {
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: 18px;
          line-height: 1.8;
          color: #cbd5e1;
          max-width: 540px;
        }
        @media (max-width: 640px) {
          .hero-desc { font-size: 16px; }
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 14px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 20px 36px;
          border-radius: 18px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 16px 50px -12px rgba(59, 130, 246, 0.6);
          transition: all 0.3s ease;
          animation: gradient-shift 4s ease infinite;
          letter-spacing: 0.05em;
        }
        .btn-primary:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 70px -15px rgba(59, 130, 246, 0.7);
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 2px solid rgba(255,255,255,0.25);
          padding: 18px 32px;
          border-radius: 18px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          backdrop-filter: blur(20px);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.18);
          border-color: rgba(255,255,255,0.4);
          transform: translateY(-3px);
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
          border-radius: 32px;
          box-shadow: 0 40px 100px -30px rgba(0,0,0,0.6);
          transition: transform 0.5s ease;
        }
        .hero-image:hover {
          transform: scale(1.03);
        }

        .features {
          max-width: 1280px;
          margin: -40px auto 0;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          position: relative;
          z-index: 10;
        }
        @media (min-width: 640px) {
          .features {
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-top: -50px;
          }
        }
        .feature-card {
          background: white;
          border-radius: 24px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 20px 60px -20px rgba(15,23,42,0.15);
          border: 1px solid rgba(15,23,42,0.06);
          text-align: center;
          transition: all 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 80px -25px rgba(15,23,42,0.2);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .feature-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 10px 30px -10px rgba(59, 130, 246, 0.3);
        }
        .feature-text h4 {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .feature-text p {
          font-size: 13px;
          color: #64748b;
          margin: 6px 0 0 0;
          font-weight: 600;
        }

        .section-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 80px 20px;
        }
        @media (max-width: 640px) {
          .section-wrapper { padding: 60px 16px; }
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 40px;
          gap: 20px;
        }
        .section-title-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .section-eyebrow {
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #3b82f6;
        }
        .section-title {
          font-size: clamp(28px, 5vw, 42px);
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .section-subtitle {
          font-size: 16px;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 18px;
        }
        @media (min-width: 540px) {
          .stores-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; }
        }
        @media (min-width: 900px) {
          .stores-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1200px) {
          .stores-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        }
        .store-card {
          background: white;
          border-radius: 28px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 30px -12px rgba(15,23,42,0.12);
          border: 1px solid rgba(15,23,42,0.06);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .store-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 30px 80px -25px rgba(15,23,42,0.25);
          border-color: rgba(59, 130, 246, 0.25);
        }
        .store-image-container {
          width: 100%;
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 50%, #fdf2ff 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .store-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .store-placeholder {
          font-size: 56px;
        }
        .store-content {
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .store-name {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .store-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 800;
          color: #3b82f6;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .offers {
          background: linear-gradient(180deg, #f8fafc 0%, #e0e7ff 100%);
        }
        .offers-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
        }
        @media (min-width: 768px) { .offers-grid { grid-template-columns: repeat(2, 1fr); gap: 28px; } }
        .offer-card {
          position: relative;
          border-radius: 32px;
          overflow: hidden;
          aspect-ratio: 16/10;
          background: linear-gradient(135deg, #1e3a8a, #0f172a, #1e293b);
          box-shadow: 0 30px 80px -30px rgba(15,23,42,0.4);
          transition: all 0.4s ease;
        }
        .offer-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 40px 100px -40px rgba(15,23,42,0.5);
        }
        .offer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.4) 0%, transparent 50%);
          pointer-events: none;
        }
        .offer-content {
          position: absolute;
          inset: 0;
          padding: 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
        }
        @media (max-width: 640px) {
          .offer-content { padding: 30px 24px; }
        }
        .offer-tag {
          display: inline-flex;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(20px);
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          width: fit-content;
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .offer-title {
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 900;
          margin: 0 0 12px 0;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .offer-btn {
          width: fit-content;
          margin-top: 28px;
          background: white;
          color: #0f172a;
          border: none;
          padding: 16px 32px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
        }
        .offer-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 20px 40px -15px rgba(0,0,0,0.4);
        }

        .ticker {
          background: linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 16px 0;
          overflow: hidden;
        }
        .ticker-inner {
          display: flex;
          width: fit-content;
          animation: ticker 25s linear infinite;
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-item {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0 60px;
          color: white;
          font-weight: 800;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          white-space: nowrap;
        }
        .ticker-highlight {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          color: white;
          padding: 8px 20px;
          border-radius: 999px;
          font-weight: 900;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);
        }

        .stats {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 100px 20px;
          position: relative;
          overflow: hidden;
        }
        .stats::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 40%);
          pointer-events: none;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 40px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) {
          .stats-inner { grid-template-columns: repeat(4, 1fr); gap: 60px; }
        }
        .stat-item { 
          text-align: center; 
          transition: transform 0.3s ease;
        }
        .stat-item:hover {
          transform: translateY(-8px);
        }
        .stat-num {
          font-size: clamp(44px, 8vw, 64px);
          font-weight: 900;
          line-height: 1;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 13px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
      `}</style>

      {/* Top Ticker */}
      <div className="top-ticker">
        <span>✨ Free Delivery on Select Products • Easy Returns • Secure Payments</span>
        <div className="ticker-right">
          <a href="/orders" className="ticker-link">Track Order</a>
          <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="ticker-link">Help Center</a>
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span>🛍️</span>
              <span>Smart Shopping, Smart Living</span>
            </div>
            <h1 className="hero-title">
              Discover the Best of <span className="accent">Odisha</span>
            </h1>
            <p className="hero-desc">
              Your premium destination for quality products from trusted local stores. Shop smart, live better with exclusive deals and fast delivery across Odisha.
            </p>
            <div className="hero-cta">
              <Link to="/products" className="btn-primary">
                Explore Products
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/products" className="btn-secondary">
                Browse All
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=80"
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
            <p>Hassle-free returns</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <div className="feature-text">
            <h4>Secure Payments</h4>
            <p>100% secure checkout</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🏪</div>
          <div className="feature-text">
            <h4>Local Stores</h4>
            <p>Trusted local sellers</p>
          </div>
        </div>
      </section>

      {/* Popular Stores */}
      {stores.length > 0 && (
        <section className="section-wrapper">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow">Shop By</span>
              <h2 className="section-title">Popular Stores</h2>
              <p className="section-subtitle">Discover amazing products from trusted local stores near you</p>
            </div>
          </div>
          <div className="stores-grid">
            {stores.map((store, i) => (
              <Link
                key={store._id}
                to={`/products?store=${encodeURIComponent(store.name)}`}
                className="store-card"
              >
                <div className="store-image-container">
                  {store.logo || store.image ? (
                    <img
                      src={getCloudinaryUrl(store.logo || store.image, 600)}
                      alt={store.name}
                      className="store-image"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <div className="store-placeholder" style={{ display: store.logo || store.image ? 'none' : 'flex' }}>🏪</div>
                </div>
                <div className="store-content">
                  <div className="store-name">{store.name}</div>
                  <div className="store-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Verified Store
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="offers">
          <div className="section-wrapper">
            <div className="section-header">
              <div className="section-title-group">
                <span className="section-eyebrow">Special</span>
                <h2 className="section-title">Hot Offers</h2>
                <p className="section-subtitle">Limited-time deals you don't want to miss</p>
              </div>
            </div>
            <div className="offers-grid">
              {offers.map((offer, i) => (
                <div key={i} className="offer-card">
                  {offer.bannerImage && (
                    <img
                      src={getCloudinaryUrl(offer.bannerImage, 1000)}
                      alt={offer.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.35 }}
                    />
                  )}
                  <div className="offer-content">
                    {offer.discountPercent && (
                      <div className="offer-tag">{offer.discountPercent}% OFF</div>
                    )}
                    <h3 className="offer-title">{offer.title || 'Amazing Deal'}</h3>
                    <Link to="/products" className="offer-btn">
                      Shop Now
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
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
            <div className="stat-label">Stores</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Support</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
            <div className="flex flex-col items-center lg:items-start gap-6">
              <div className="flex items-center gap-5">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center overflow-hidden shadow-lg shadow-blue-900/50">
                  <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-black tracking-tighter leading-none">
                    <span className="text-blue-400">SMART</span>
                    <span className="text-purple-400">ODISHA</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-400 tracking-widest mt-1.5">SMART CHOICE, SMART LIFE</span>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 rounded-xl border border-slate-700">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-ping absolute"></span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-bold text-green-400 uppercase tracking-widest ml-1">Store Status: Online</span>
              </div>
            </div>
            <div className="flex flex-col items-center lg:items-end gap-8">
              <div className="flex flex-wrap justify-center lg:justify-end gap-3">
                <a
                  href={`mailto:${CONFIG.SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold uppercase tracking-widest hover:bg-slate-700 hover:border-slate-600 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" />
                    <polyline points="22,6 12,13 2,6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Mail Us
                </a>
                <a
                  href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold uppercase tracking-widest hover:bg-slate-700 hover:border-slate-600 transition-all"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Message Us
                </a>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 w-full sm:w-auto">
                <Link to="/privacy-policy" className="text-sm font-semibold text-slate-400 uppercase tracking-widest hover:text-white transition-colors text-center sm:text-right">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="text-sm font-semibold text-slate-400 uppercase tracking-widest hover:text-white transition-colors text-center sm:text-right">
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
