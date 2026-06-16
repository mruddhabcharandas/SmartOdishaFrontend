import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONFIG } from '../../shared/lib/config.js'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import api from '../../lib/api'
import { getImageUrl } from '../../lib/cloudinary'
import { useAuth } from '../../lib/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [stores, setStores] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState([])

  useEffect(() => {
    setSEO('SmartOdisha | Premium Shopping Destination', 'Your premium destination for quality products from trusted local stores in Odisha.')
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "SmartOdisha",
      "url": window.location.origin,
      "logo": window.location.origin + "/logo.png",
      "description": "Premium shopping platform for quality products from trusted local stores across Odisha."
    })
    api.get('/api/offers?activeOnly=true').then(({ data }) => setOffers(data || [])).catch(() => setOffers([]))
    api.get('/api/public/stores').then(({ data }) => setStores(data?.filter(store => store.isPopular) || [])).catch(() => setStores([]))
    api.get('/api/products?limit=12').then(({ data }) => setProducts(data?.items || [])).catch(() => setProducts([]))
  }, [])

  const tickerLoop = useMemo(() => {
    const neutral = [
      { key: 'n1', label: 'Free Delivery on Orders Above ₹999', pill: 'FREE SHIPPING' },
      { key: 'n2', label: 'COD Available Across Odisha', pill: 'CASH ON DELIVERY' },
      { key: 'n3', label: '7-Day Easy Returns', pill: 'HASSLE-FREE' },
      { key: 'n4', label: '100% Secure Payments', pill: 'TRUSTED' }
    ]
    return [...neutral, ...neutral]
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="home-root min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        .home-root {
          font-family: 'DM Sans', sans-serif;
          background: #f0f9ff;
          color: #1e1b2e;
        }

        .top-ticker {
          background: linear-gradient(90deg, #1e3a8a, #f97316);
          color: white;
          padding: 8px 20px;
          font-size: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .top-ticker { justify-content: center; text-align: center; gap: 8px; }
        }
        .ticker-right { display: flex; gap: 12px; }
        .ticker-link { color: white; text-decoration: none; font-weight: 700; transition: all 0.2s; padding: 6px 16px; border-radius: 100px; background: rgba(255,255,255,0.2); font-size:11px; letter-spacing: 0.1em; text-transform: uppercase; }
        .ticker-link:hover { background: rgba(255,255,255,0.3); transform: translateY(-1px); }

        .hero {
          color: #1e1b2e;
          padding: 40px 20px 60px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -180px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(30,58,138,0.07), transparent 65%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
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
          gap: 20px;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          background: rgba(30,58,138,0.1);
          border: 1px solid rgba(30,58,138,0.2);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 700;
          width: fit-content;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #f97316;
        }
        .hero-eyebrow span.dot { width: 5px; height: 5px; border-radius: 50%; background: #f97316; box-shadow: 0 0 5px rgba(249,115,22,0.5); animation: pulse 2s ease infinite; }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.7); } }
        .hero-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 6vw, 64px);
          line-height: 1.1;
          letter-spacing: 0.03em;
          color: #1e1b2e;
        }
        .hero-title .accent {
          color: #f97316;
        }
        .hero-desc {
          font-size: 16px;
          line-height: 1.6;
          color: #6b7280;
          max-width: 520px;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .hero-desc { font-size: 14px; }
        }
        .hero-search {
          display: flex;
          width: 100%;
          max-width: 560px;
          gap: 0px;
          margin-top: 8px;
        }
        .hero-search-input {
          flex: 1;
          padding: 16px 20px;
          border-radius: 14px 0 0 14px;
          border: 1px solid rgba(30,58,138,0.15);
          border-right: none;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          background: white;
          color: #1e1b2e;
        }
        .hero-search-input::placeholder {
          color: #9ca3af;
        }
        .hero-search-btn {
          padding: 16px 28px;
          border-radius: 0 14px 14px 0;
          border: none;
          background: linear-gradient(135deg, #f97316, #1e3a8a);
          color: white;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 24px rgba(249,115,22,0.25);
        }
        .hero-search-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 32px rgba(249,115,22,0.35);
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #f97316, #1e3a8a);
          color: white;
          border: none;
          padding: 15px 32px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(249,115,22,0.25);
        }
        .btn-primary:hover {
          transform: translateY(-3px) scale(1.02);
          box-shadow: 0 14px 32px rgba(249,115,22,0.35);
        }
        .btn-secondary {
          background: white;
          color: #f97316;
          border: 1px solid rgba(30,58,138,0.15);
          padding: 14px 30px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .btn-secondary:hover {
          border-color: #f97316;
          transform: translateY(-2px);
        }
        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .hero-image {
          width: 100%;
          max-width: 400px;
          height: auto;
          border-radius: 28px;
          box-shadow: 0 20px 60px -20px rgba(30,58,138,0.3);
          transition: all 0.5s ease;
          animation: float 6s ease-in-out infinite;
        }
        .hero-image:hover {
          transform: scale(1.03);
          box-shadow: 0 30px 80px -30px rgba(30,58,138,0.4);
        }

        .features {
          max-width: 1280px;
          margin: 0 auto 0;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          position: relative;
          z-index: 10;
        }
        @media (min-width: 768px) {
          .features { grid-template-columns: repeat(4, 1fr); gap: 16px; }
        }
        .feature-card {
          background: white;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 18px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(30,58,138,0.04);
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
          animation: fadeInUp 0.5s ease both;
          position: relative;
          overflow: hidden;
        }
        .feature-card:nth-child(1) { animation-delay: 0s; }
        .feature-card:nth-child(2) { animation-delay: 0.1s; }
        .feature-card:nth-child(3) { animation-delay: 0.2s; }
        .feature-card:nth-child(4) { animation-delay: 0.3s; }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        .feature-card::before { content: ''; position: absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, rgba(30,58,138,0.2), transparent); opacity:0; transition: opacity 0.2s; }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 24px rgba(249,115,22,0.12);
          border-color: rgba(249,115,22,0.2);
        }
        .feature-card:hover::before { opacity:1; }
        .feature-icon {
          width: 56px;
          height: 56px;
          background: #f0f9ff;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon svg { width: 24px; height: 24px; color: #f97316; }
        .feature-text h4 {
          font-size: 14px;
          font-weight: 700;
          color: #1e1b2e;
          margin: 0;
        }
        .feature-text p {
          font-size: 12px;
          color: #9ca3af;
          margin: 4px 0 0 0;
          font-weight: 500;
        }

        .section-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 48px 20px;
        }
        @media (max-width: 640px) {
          .section-wrapper { padding: 32px 16px; }
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
          gap: 24px;
        }
        .section-title-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .section-eyebrow {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          color: #f97316;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-eyebrow::before { content: ''; width: 20px; height: 2px; background: rgba(30,58,138,0.35); border-radius: 2px; }
        .section-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 700;
          color: #1e1b2e;
          margin: 0;
          letter-spacing: 0.03em;
        }
        .section-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          font-weight: 500;
          max-width: 500px;
        }
        .section-btn {
          padding: 10px 20px;
          background: white;
          border: 1px solid rgba(30,58,138,0.15);
          border-radius: 12px;
          color: #f97316;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .section-btn:hover {
          background: #f97316;
          color: white;
          border-color: #f97316;
          transform: translateY(-2px);
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .stores-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (min-width: 1024px) {
          .stores-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        .store-card {
          background: white;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #1e1b2e;
          transition: all 0.3s ease;
          box-shadow: 0 2px 12px rgba(30,58,138,0.04);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .store-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 24px rgba(249,115,22,0.12);
          border-color: rgba(249,115,22,0.2);
        }
        .store-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, rgba(30,58,138,0.2), transparent); opacity:0; transition: opacity 0.2s; }
        .store-card:hover::before { opacity:1; }
        .store-image-container {
          width: 100%;
          aspect-ratio: 4/3;
          background: #f0f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }
        .store-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .store-placeholder {
          display: flex;
        }
        .store-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .store-name {
          font-size: 14px;
          font-weight: 700;
          color: #1e1b2e;
        }
        .store-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: rgba(5,150,105,0.06);
          border: 1px solid rgba(5,150,105,0.12);
          padding: 4px 10px;
          border-radius: 8px;
          width: fit-content;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .products-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (min-width: 1024px) {
          .products-grid { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        .product-card {
          background: white;
          border: 1px solid rgba(30,58,138,0.1);
          border-radius: 18px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #1e1b2e;
          transition: all 0.3s ease;
          box-shadow: 0 2px 12px rgba(30,58,138,0.04);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .product-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 24px rgba(249,115,22,0.12);
          border-color: rgba(249,115,22,0.2);
        }
        .product-card::before { content:''; position:absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, rgba(30,58,138,0.2), transparent); opacity:0; transition: opacity 0.2s; }
        .product-card:hover::before { opacity:1; }
        .product-image-container {
          width: 100%;
          aspect-ratio: 1;
          background: #f0f9ff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 16px;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .product-content {
          padding: 12px 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .product-name {
          font-size: 13px;
          font-weight: 600;
          color: #1e1b2e;
          line-height: 1.4;
        }
        .product-price-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .product-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #f97316;
          letter-spacing: 0.03em;
        }
        .product-mrp {
          font-size: 12px;
          color: #9ca3af;
          text-decoration: line-through;
        }

        .offers {
          background: white;
        }
        .offers-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) { .offers-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        .offer-card {
          position: relative;
          border-radius: 18px;
          overflow: hidden;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #1e3a8a, #f97316);
          box-shadow: 0 4px 16px rgba(30,58,138,0.15);
          transition: all 0.3s ease;
        }
        .offer-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(249,115,22,0.25);
        }
        .offer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(255,255,255,0.2) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(255,255,255,0.15) 0%, transparent 50%);
          pointer-events: none;
        }
        .offer-content {
          position: absolute;
          inset: 0;
          padding: 32px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
        }
        @media (max-width: 640px) {
          .offer-content { padding: 24px; }
        }
        .offer-tag {
          display: inline-flex;
          background: white;
          color: #f97316;
          padding: 6px 16px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          width: fit-content;
          margin-bottom: 12px;
        }
        .offer-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 700;
          margin: 0 0 8px 0;
          line-height: 1.2;
          letter-spacing: 0.03em;
        }
        .offer-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.9);
          font-weight: 500;
          max-width: 360px;
        }
        .offer-btn {
          width: fit-content;
          margin-top: 20px;
          background: white;
          color: #f97316;
          border: none;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .offer-btn:hover {
          transform: translateY(-2px);
        }

        .ticker {
          background: linear-gradient(90deg, #1e3a8a, #f97316);
          padding: 12px 0;
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
          padding: 0 48px;
          color: white;
          font-weight: 700;
          font-size: 12px;
          white-space: nowrap;
        }
        .ticker-highlight {
          background: white;
          color: #f97316;
          padding: 6px 18px;
          border-radius: 100px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .stats {
          background: linear-gradient(135deg, #1e3a8a, #f97316);
          color: white;
          padding: 60px 20px;
          position: relative;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) {
          .stats-inner { grid-template-columns: repeat(4, 1fr); gap: 40px; }
        }
        .stat-item { 
          text-align: center; 
          transition: all 0.3s ease;
        }
        .stat-item:hover {
          transform: translateY(-4px);
        }
        .stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 6vw, 48px);
          font-weight: 700;
          line-height: 1;
          margin-bottom: 8px;
          color: white;
          letter-spacing: 0.03em;
        }
        .stat-label {
          font-size: 13px;
          font-weight: 700;
          color: rgba(255,255,255,0.9);
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }

        footer {
          background: white;
          border-top: 1px solid rgba(30,58,138,0.1);
        }
      `}</style>

      {/* Top Ticker */}
      <div className="top-ticker">
        <span>✦ Free Delivery on ₹999+ • 7-Day Returns • 100% Secure Checkout</span>
        <div className="ticker-right">
          <Link to="/orders" className="ticker-link">Track Order</Link>
          <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="ticker-link">24/7 Support</a>
        </div>
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
          <span className="dot"></span>
          <span>Odisha's Premium Marketplace</span>
        </div>
            <h1 className="hero-title">
              Shop the Best of <span className="accent">Odisha</span>
            </h1>
            <p className="hero-desc">
              Experience premium shopping with curated products from trusted local stores. Enjoy fast delivery, secure payments, and exclusive deals across Odisha.
            </p>
            <form onSubmit={handleSearch} className="hero-search">
              <input
                type="text"
                placeholder="Search for products, brands, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hero-search-input"
              />
              <button type="submit" className="hero-search-btn">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search
              </button>
            </form>
            <div className="hero-cta">
              <Link to="/products" className="btn-primary">
                Explore Products
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/about" className="btn-secondary">
                About SmartOdisha
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <img src="/banner.jpeg" alt="SmartOdisha Banner" className="hero-image" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div className="feature-text">
            <h4>Free Delivery</h4>
            <p>On orders above ₹999</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <div className="feature-text">
            <h4>Easy Returns</h4>
            <p>7-day hassle-free returns</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <div className="feature-text">
            <h4>Secure Payments</h4>
            <p>100% encrypted checkout</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div className="feature-text">
            <h4>Fast Shipping</h4>
            <p>Reliable delivery across Odisha</p>
          </div>
        </div>
      </section>



      {/* Our Popular Sellers */}
      {stores.length > 0 && (
        <section className="section-wrapper">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow">Trusted Partners</span>
              <h2 className="section-title">Popular Stores</h2>
              <p className="section-subtitle">Shop from verified local stores offering the best products and service</p>
            </div>
          </div>
          <div className="stores-grid">
            {stores.map((store) => (
              <Link
                key={store._id}
                to={`/products?store=${store._id}`}
                className="store-card"
              >
                <div className="store-image-container">
                  {store.sellerAvatar?.url || store.logo || store.image?.url ? (
                    <img
                      src={getImageUrl(store.sellerAvatar?.url || store.logo || store.image?.url, 600)}
                      alt={store.name}
                      className="store-image"
                    />
                  ) : (
                    <div className="store-placeholder">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5">
                        <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                      </svg>
                    </div>
                  )}
                </div>
                <div className="store-content">
                  <div className="store-name">{store.name}</div>
                  <div className="store-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
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
                <span className="section-eyebrow">Limited Time</span>
                <h2 className="section-title">Hot Deals & Offers</h2>
                <p className="section-subtitle">Don't miss out on these exclusive offers available for a limited time</p>
              </div>
            </div>
            <div className="offers-grid">
              {offers.map((offer, i) => (
                <div key={i} className="offer-card">
                  {offer.bannerImage && (
                    <img
                      src={getImageUrl(offer.bannerImage, 1200)}
                      alt={offer.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.25 }}
                    />
                  )}
                  <div className="offer-content">
                    {offer.discountPercent && (
                      <div className="offer-tag">{offer.discountPercent}% OFF</div>
                    )}
                    <h3 className="offer-title">{offer.title || 'Amazing Deals'}</h3>
                    <p className="offer-desc">{offer.description || 'Shop now for exclusive discounts and offers on premium products'}</p>
                    <Link to="/products" className="offer-btn">
                      Shop the Offer
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
            <div className="stat-num">15K+</div>
            <div className="stat-label">Happy Customers</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">1K+</div>
            <div className="stat-label">Products</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">100+</div>
            <div className="stat-label">Trusted Stores</div>
          </div>
          <div className="stat-item">
            <div className="stat-num">24/7</div>
            <div className="stat-label">Customer Support</div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="bg-white border-t border-blue-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between mb-12 pb-10 border-b border-blue-100">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-orange-500 to-blue-700 flex items-center justify-center overflow-hidden shadow-2xl shadow-orange-900/20">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter leading-none">
                  <span className="text-blue-700">SMART</span>
                  <span className="text-orange-500">ODISHA</span>
                </span>
                <span className="text-[11px] font-semibold text-gray-500 tracking-widest mt-1" style={{ 
                  background: 'linear-gradient(90deg, #f97316, #1e3a8a, #f97316)', 
                  backgroundSize: '300% 100%', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent', 
                  animation: 'gradientMove 5s linear infinite'
                }}>PREMIUM SHOPPING DESTINATION</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link to="/business/login" className="px-6 py-3 bg-gradient-to-r from-orange-500 to-blue-700 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:shadow-lg hover:scale-105 transition-all shadow-xl shadow-orange-900/20">
                Seller Login
              </Link>
              <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-sm font-semibold">Email Us</span>
              </a>
              <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.646.917 5.082 2.477 7.053L0 24l5.247-1.342C7.317 23.678 9.585 24 12 24c6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-semibold">WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Quick Links</h4>
              <div className="flex flex-col gap-3">
                <Link to="/products" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Shop Products</Link>
                <Link to="/about" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">About Us</Link>
                <Link to="/orders" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Track Order</Link>
                <Link to="/business/request" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Become a Seller</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Support</h4>
              <div className="flex flex-col gap-3">
                <Link to="/contact" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Contact Us</Link>
                <Link to="/orders" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">My Orders</Link>
                <Link to="/wishlist" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Wishlist</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Legal</h4>
              <div className="flex flex-col gap-3">
                <Link to="/privacy-policy" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Terms of Service</Link>
                <Link to="/contact" className="text-gray-600 text-sm font-semibold hover:text-orange-500 transition-colors">Return Policy</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://instagram.com/smartodisha.in?igsh=N3c3NnlhOGVmZXho" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://facebook.com/share/18EgsKKhie/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12.073c0 6.001 4.388 10.966 10.125 11.855v-8.383h-3.047v-3.472h3.047V9.413c0-3.007 1.789-4.668 4.533-4.668 1.31 0 2.686.238 2.686.238v2.953h-1.514c-1.488 0-1.952.925-1.952 1.874v2.256h3.321l-.531 3.472h-2.79v8.383c5.736-.889 10.125-5.854 10.125-11.855z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/in/Smart-Odisha-774a30415?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-gray-600 hover:bg-orange-50 hover:text-orange-500 hover:border-orange-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554V14.89c0-1.337-.026-3.057-1.86-3.057-1.864 0-2.151 1.453-2.151 2.963v5.647H9.322V9h3.414v1.561h.046c.477-.9 1.637-1.859 3.37-1.859 3.601 0 4.268 2.37 4.268 5.455v6.295zM5.337 7.433a2.06 2.06 0 0 1-2.063-2.065c0-1.141.92-2.064 2.063-2.064 1.142 0 2.064.923 2.064 2.064 0 1.142-.922 2.065-2.064 2.065zM7.105 20.452H3.568V9h3.537v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} SmartOdisha. All rights reserved.</span>
            <span>Made with ❤️ in Odisha</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
