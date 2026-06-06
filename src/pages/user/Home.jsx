import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CONFIG } from '../../shared/lib/config.js'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'
import { useAuth } from '../../lib/AuthContext'

export default function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [offers, setOffers] = useState([])
  const [stores, setStores] = useState([])
  const [categories, setCategories] = useState([])
  const [openFaq, setOpenFaq] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

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
    api.get('/api/categories?active=true').then(({ data }) => setCategories(data || [])).catch(() => setCategories([]))
  }, [])

  const faqs = [
    {
      question: "What is SmartOdisha?",
      answer: "SmartOdisha is your premier destination for quality products from trusted local stores across Odisha. We bring the best of Odisha right to your doorstep!"
    },
    {
      question: "Is COD available?",
      answer: "Yes! Cash on Delivery (COD) is available on select products across Odisha for a hassle-free shopping experience."
    },
    {
      question: "How long does delivery take?",
      answer: "Delivery times vary by location, but most orders are delivered within 24-48 hours within Odisha."
    },
    {
      question: "What is the return policy?",
      answer: "We offer easy returns within 7 days of delivery for most products. Check product details for specific return policies."
    },
    {
      question: "How can I become a seller?",
      answer: "Click on 'Become a Seller' in the footer and fill out the form. Our team will get back to you within 24-48 hours!"
    }
  ]

  const tickerLoop = useMemo(() => {
    const neutral = [
      { key: 'n1', label: 'Free Delivery on Select Products', pill: 'Free' },
      { key: 'n2', label: 'COD Available', pill: 'Cash On Delivery' },
      { key: 'n3', label: 'Easy Returns Available', pill: 'Hassle-free' },
      { key: 'n4', label: '100% Secure Payments', pill: 'Trusted' },
      { key: 'n5', label: 'Fast Delivery Across Odisha', pill: 'SmartOdisha' }
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
    <div className="home-root bg-gray-50 min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        
        .home-root {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(180deg, #0f172a 0%, #020617 35%, #f8fafc 35%, #f8fafc 100%);
          color: #0f172a;
        }

        .top-ticker {
          background: linear-gradient(90deg, #3b82f6 0%, #4f46e5 50%, #2563eb 100%);
          color: white;
          padding: 8px 16px;
          font-size: 11px;
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
        .ticker-right { display: flex; gap: 12px; }
        .ticker-link { color: white; text-decoration: none; font-weight: 700; transition: all 0.2s; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.1); font-size:10px }
        .ticker-link:hover { background: rgba(255,255,255,0.2); transform: translateY(-1px); }

        .hero {
          color: white;
          padding: 40px 20px 60px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(37, 99, 235, 0.15) 0%, transparent 50%);
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
            gap: 40px;
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
          padding: 8px 16px;
          background: rgba(255,255,255,0.12);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          font-size: 12px;
          font-weight: 700;
          width: fit-content;
          box-shadow: 0 8px 32px rgba(15, 23, 42, 0.2);
        }
        .hero-title {
          font-size: clamp(28px, 5vw, 52px);
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: -0.04em;
        }
        .hero-title .accent {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: 15px;
          line-height: 1.7;
          color: #cbd5e1;
          max-width: 500px;
        }
        @media (max-width: 640px) {
          .hero-desc { font-size: 14px; }
        }
        .hero-search {
          display: flex;
          width: 100%;
          max-width: 500px;
          gap: 8px;
          margin-top: 8px;
        }
        .hero-search-input {
          flex: 1;
          padding: 14px 18px;
          border-radius: 14px;
          border: none;
          outline: none;
          font-size: 14px;
          font-weight: 600;
          background: rgba(255,255,255,0.95);
        }
        .hero-search-btn {
          padding: 14px 24px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hero-search-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(249,115,22,0.5);
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #4f46e5);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 16px 28px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 12px 40px -10px rgba(59, 130, 246, 0.6);
          transition: all 0.3s ease;
          animation: gradient-shift 4s ease infinite;
          letter-spacing: 0.05em;
        }
        .btn-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px -15px rgba(59, 130, 246, 0.7);
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: white;
          border: 2px solid rgba(255,255,255,0.3);
          padding: 14px 24px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          backdrop-filter: blur(20px);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px -10px rgba(255,255,255,0.3);
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
          box-shadow: 0 30px 80px -30px rgba(0,0,0,0.6);
          transition: transform 0.5s ease;
          max-height: 320px;
        }
        .hero-image:hover {
          transform: scale(1.03);
        }

        .features {
          max-width: 1280px;
          margin: -30px auto 0;
          padding: 0 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          position: relative;
          z-index: 10;
        }
        .feature-card {
          flex: 1 1 calc(50% - 12px);
          min-width: 140px;
          background: white;
          border-radius: 18px;
          padding: 20px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 12px 40px -20px rgba(15,23,42,0.15);
          border: 1px solid rgba(15,23,42,0.06);
          text-align: left;
          transition: all 0.3s ease;
        }
        @media (min-width: 768px) {
          .feature-card { flex: 1 1 calc(25% - 12px); }
        }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 60px -25px rgba(59,130,246,0.2);
          border-color: rgba(59, 130, 246, 0.2);
        }
        .feature-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #dbeafe 0%, #a5b4fc 100%);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon svg { width: 22px; height: 22px; color: #2563eb; }
        .feature-text h4 {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .feature-text p {
          font-size: 12px;
          color: #64748b;
          margin: 4px 0 0 0;
          font-weight: 600;
        }

        .section-wrapper {
          max-width: 1280px;
          margin: 0 auto;
          padding: 60px 20px;
        }
        @media (max-width: 640px) {
          .section-wrapper { padding: 48px 16px; }
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 32px;
          gap: 16px;
        }
        .section-title-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .section-eyebrow {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #3b82f6;
        }
        .section-title {
          font-size: clamp(24px, 4vw, 36px);
          font-weight: 900;
          color: #3b82f6;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .section-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }
        @media (min-width: 640px) {
          .stores-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; }
        }
        @media (min-width: 1024px) {
          .stores-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
        }
        .store-card {
          background: white;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 24px rgba(15,23,42,0.08);
          border: 1px solid rgba(59, 130, 246, 0.1);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .store-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(59,130,246,0.2);
          border-color: rgba(59,130,246,0.3);
        }
        .store-image-container {
          width: 100%;
          aspect-ratio: 16/10;
          background: linear-gradient(145deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 16px;
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
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }
        .store-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 800;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: #d1fae5;
          padding: 4px 10px;
          border-radius: 999px;
          width: fit-content;
        }

        .offers {
          background: linear-gradient(180deg, #f8fafc 0%, #dbeafe 100%);
        }
        .offers-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) { .offers-grid { grid-template-columns: repeat(2, 1fr); gap: 20px; } }
        .offer-card {
          position: relative;
          border-radius: 24px;
          overflow: hidden;
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #3b82f6, #4f46e5, #1e1b4b);
          box-shadow: 0 24px 70px -30px rgba(59,130,246,0.4);
          transition: all 0.4s ease;
        }
        .offer-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 32px 90px -40px rgba(59,130,246,0.5);
        }
        .offer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(255,255,255,0.25) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(255,255,255,0.2) 0%, transparent 50%);
          pointer-events: none;
        }
        .offer-content {
          position: absolute;
          inset: 0;
          padding: 28px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
        }
        @media (max-width: 640px) {
          .offer-content { padding: 22px 18px; }
        }
        .offer-tag {
          display: inline-flex;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(20px);
          padding: 8px 16px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          width: fit-content;
          margin-bottom: 14px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .offer-title {
          font-size: clamp(22px, 4vw, 36px);
          font-weight: 900;
          margin: 0 0 10px 0;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .offer-btn {
          width: fit-content;
          margin-top: 20px;
          background: white;
          color: #3b82f6;
          border: none;
          padding: 12px 26px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 8px 24px -10px rgba(0,0,0,0.3);
        }
        .offer-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 16px 36px -15px rgba(0,0,0,0.4);
        }

        .ticker {
          background: linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 12px 0;
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
          gap: 16px;
          padding: 0 48px;
          color: white;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          white-space: nowrap;
        }
        .ticker-highlight {
          background: linear-gradient(135deg, #3b82f6, #4f46e5);
          color: white;
          padding: 6px 16px;
          border-radius: 999px;
          font-weight: 900;
          box-shadow: 0 4px 20px rgba(59,130,246,0.4);
        }

        .stats {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          padding: 60px 20px;
          position: relative;
          overflow: hidden;
        }
        .stats::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 40%);
          pointer-events: none;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 30px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) {
          .stats-inner { grid-template-columns: repeat(4, 1fr); gap: 40px; }
        }
        .stat-item { 
          text-align: center; 
          transition: transform 0.3s ease;
        }
        .stat-item:hover {
          transform: translateY(-6px);
        }
        .stat-num {
          font-size: clamp(36px, 6vw, 52px);
          font-weight: 900;
          line-height: 1;
          margin-bottom: 10px;
          background: linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
      `}</style>

      {/* Top Ticker */}
      <div className="top-ticker">
        <span>Free Delivery on Select Products • Easy Returns • Secure Payments</span>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
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
                Shop Now
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/about" className="btn-secondary">
                Learn More
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="hero-right">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80"
              alt="Shopping"
              className="hero-image"
            />
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
            <p>On select products</p>
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
            <p>Hassle-free returns</p>
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
            <p>100% secure checkout</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
          <div className="feature-text">
            <h4>Local Stores</h4>
            <p>Trusted local sellers</p>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section-wrapper">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow">Browse</span>
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Explore products by category for easier shopping</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?category=${cat._id}`}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col items-center gap-3"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-100 overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-2xl">🏷️</span>
                  )}
                </div>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-sm capitalize">{cat.name}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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
              to={`/products?store=${store._id}`}
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
                      }}
                    />
                  ) : null}
                  <div className="store-placeholder" style={{ display: (store.logo || store.image) ? 'none' : 'flex' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5">
                      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                    </svg>
                  </div>
                </div>
                <div className="store-content">
                  <div className="store-name">{store.name}</div>
                  <div className="store-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
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
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* FAQ Section */}
      <section className="section-wrapper bg-white">
        <div className="section-header">
          <div className="section-title-group">
            <span className="section-eyebrow">Got Questions?</span>
            <h2 className="section-title">Frequently Asked</h2>
            <p className="section-subtitle">Everything you need to know about shopping with us</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden transition-all">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left focus:outline-none"
              >
                <span className="text-sm font-bold text-gray-900">{faq.question}</span>
                <svg 
                  width="18" height="18" fill="none" stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  className={`text-gray-500 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-gray-600 font-medium">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between mb-8 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center overflow-hidden shadow-lg shadow-indigo-900/50">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tighter leading-none">
                  <span className="text-blue-400">SMART</span>
                  <span className="text-orange-400">ODISHA</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 tracking-widest mt-0.5" style={{ 
                  background: 'linear-gradient(90deg, #3b82f6, #f97316, #10b981, #8b5cf6, #3b82f6)', 
                  backgroundSize: '200% 100%', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent', 
                  animation: 'gradientMove 3s linear infinite'
                }}>SMART CHOICE, SMART LIFE</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link to="/business/login" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg text-white text-xs font-black uppercase tracking-widest hover:shadow-lg hover:scale-105 transition-all">
                Seller Login
              </Link>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">COD Available</span>
              </div>
              <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-xs font-semibold">Email Us</span>
              </a>
              <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.646.917 5.082 2.477 7.053L0 24l5.247-1.342C7.317 23.678 9.585 24 12 24c6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-xs font-semibold">WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/products" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Shop Products</Link>
                <Link to="/about" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">About Us</Link>
                <Link to="/orders" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Track Order</Link>
                <Link to="/business/request" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Become a Seller</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Support</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/contact" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Contact Us</Link>
                <Link to="/orders" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">My Orders</Link>
                <Link to="/wishlist" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Wishlist</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-4">Legal</h4>
              <div className="flex flex-col gap-2.5">
                <Link to="/privacy-policy" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/contact" className="text-slate-400 text-sm font-semibold hover:text-white transition-colors">Return Policy</Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} SmartOdisha. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
