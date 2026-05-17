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
      { key: 'n1', label: 'Free Delivery on Orders Over ₹499', pill: 'Free' },
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
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px rgba(249,115,22,0.35);
          transition: all 0.2s;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(249,115,22,0.45);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 1px solid rgba(255,255,255,0.2);
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.3);
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
        <span>📦 Free Delivery on Orders Over ₹499</span>
        <div className="ticker-right">
          <a href="/orders" className="ticker-link">Track Order</a>
          <a href="tel:+919827058262" className="ticker-link">Help Center</a>
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
            <p>On orders over ₹499</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔄</div>
          <div className="feature-text">
            <h4>Easy Returns</h4>
            <p>15 days return policy</p>
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
    </div>
  )
}
