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
  const [openFaq, setOpenFaq] = useState(null)
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

  const faqs = [
    {
      question: "What is SmartOdisha?",
      answer: "SmartOdisha is Odisha's premier e-commerce platform connecting you with trusted local stores. We bring the best of Odisha right to your doorstep with premium quality products and fast delivery."
    },
    {
      question: "Is Cash on Delivery available?",
      answer: "Absolutely! Cash on Delivery (COD) is available across most locations in Odisha for a hassle-free shopping experience."
    },
    {
      question: "How fast is the delivery?",
      answer: "Most orders are delivered within 24-48 hours within Odisha. We partner with Delhivery for fast and reliable delivery services."
    },
    {
      question: "What about returns and refunds?",
      answer: "We offer easy 7-day returns for most products. If you're not satisfied, simply initiate a return from your order history."
    },
    {
      question: "How can I become a seller?",
      answer: "Click on 'Become a Seller' in the footer or navigate to /business/request to register your store. Our team will get back to you within 24-48 hours!"
    }
  ]

  const tickerLoop = useMemo(() => {
    const neutral = [
      { key: 'n1', label: 'Free Delivery on Orders Above ₹999', pill: 'FREE SHIPPING' },
      { key: 'n2', label: 'COD Available Across Odisha', pill: 'CASH ON DELIVERY' },
      { key: 'n3', label: '7-Day Easy Returns', pill: 'HASSLE-FREE' },
      { key: 'n4', label: '100% Secure Payments', pill: 'TRUSTED' },
      { key: 'n5', label: 'Delivered by Delhivery', pill: 'FAST DELIVERY' }
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
    <div className="home-root bg-zinc-50 min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
        
        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        
        .home-root {
          font-family: 'Inter', sans-serif;
          background: linear-gradient(180deg, #050505 0%, #111827 35%, #fafafa 35%, #fafafa 100%);
          color: #020617;
        }

        .top-ticker {
          background: linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%);
          background-size: 200% 200%;
          animation: gradientMove 4s ease infinite;
          color: white;
          padding: 10px 20px;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          box-shadow: 0 10px 40px rgba(16, 185, 129, 0.2);
        }
        @media (max-width: 640px) {
          .top-ticker { justify-content: center; text-align: center; gap: 8px; }
        }
        .ticker-right { display: flex; gap: 12px; }
        .ticker-link { color: white; text-decoration: none; font-weight: 800; transition: all 0.2s; padding: 6px 16px; border-radius: 999px; background: rgba(255,255,255,0.15); font-size:10px; backdrop-filter: blur(10px); }
        .ticker-link:hover { background: rgba(255,255,255,0.25); transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }

        .hero {
          color: white;
          padding: 60px 20px 100px;
          position: relative;
          overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(59, 130, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
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
          gap: 24px;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          width: fit-content;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 6vw, 64px);
          line-height: 1.05;
          font-weight: 800;
          letter-spacing: -0.03em;
        }
        .hero-title .accent {
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: 16px;
          line-height: 1.7;
          color: #cbd5e1;
          max-width: 520px;
          font-weight: 500;
        }
        @media (max-width: 640px) {
          .hero-desc { font-size: 15px; }
        }
        .hero-search {
          display: flex;
          width: 100%;
          max-width: 560px;
          gap: 12px;
          margin-top: 8px;
        }
        .hero-search-input {
          flex: 1;
          padding: 18px 24px;
          border-radius: 18px;
          border: 2px solid rgba(255,255,255,0.1);
          outline: none;
          font-size: 15px;
          font-weight: 600;
          background: rgba(255,255,255,0.08);
          color: white;
          backdrop-filter: blur(20px);
          transition: all 0.3s ease;
        }
        .hero-search-input::placeholder {
          color: rgba(255,255,255,0.5);
        }
        .hero-search-input:focus {
          border-color: rgba(16, 185, 129, 0.6);
          background: rgba(255,255,255,0.12);
          box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.1);
        }
        .hero-search-btn {
          padding: 18px 32px;
          border-radius: 18px;
          border: none;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 10px 40px rgba(16, 185, 129, 0.4);
        }
        .hero-search-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 60px rgba(16, 185, 129, 0.5);
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          color: white;
          border: none;
          padding: 18px 36px;
          border-radius: 18px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 12px 40px rgba(59, 130, 246, 0.4);
          transition: all 0.3s ease;
          animation: gradientMove 4s ease infinite;
          letter-spacing: 0.05em;
        }
        .btn-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 80px rgba(59, 130, 246, 0.5);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: white;
          border: 2px solid rgba(255,255,255,0.2);
          padding: 16px 32px;
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
          background: rgba(255,255,255,0.15);
          border-color: rgba(255,255,255,0.35);
          transform: translateY(-3px);
          box-shadow: 0 16px 60px rgba(255,255,255,0.1);
        }
        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
        }
        .hero-image {
          width: 100%;
          max-width: 480px;
          height: auto;
          border-radius: 32px;
          box-shadow: 0 40px 100px -40px rgba(0,0,0,0.6);
          transition: all 0.5s ease;
          animation: float 6s ease-in-out infinite;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .hero-image:hover {
          transform: scale(1.05);
          box-shadow: 0 60px 140px -60px rgba(0,0,0,0.7);
        }

        .features {
          max-width: 1280px;
          margin: -50px auto 0;
          padding: 0 20px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          position: relative;
          z-index: 10;
        }
        @media (min-width: 768px) {
          .features { grid-template-columns: repeat(4, 1fr); gap: 20px; }
        }
        .feature-card {
          background: white;
          border-radius: 24px;
          padding: 28px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          box-shadow: 0 12px 60px -30px rgba(0,0,0,0.15);
          border: 1px solid rgba(0,0,0,0.05);
          text-align: center;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 24px 80px -30px rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .feature-icon {
          width: 72px;
          height: 72px;
          background: linear-gradient(135deg, #ecfdf5 0%, #dbeafe 100%);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon svg { width: 32px; height: 32px; color: #059669; }
        .feature-text h4 {
          font-size: 16px;
          font-weight: 800;
          color: #020617;
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
          gap: 24px;
        }
        .section-title-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .section-eyebrow {
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          color: #3b82f6;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(28px, 4.5vw, 44px);
          font-weight: 800;
          color: #020617;
          letter-spacing: -0.03em;
          margin: 0;
        }
        .section-subtitle {
          font-size: 15px;
          color: #64748b;
          margin: 0;
          font-weight: 500;
          max-width: 500px;
        }
        .section-btn {
          padding: 14px 28px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          color: #020617;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .section-btn:hover {
          background: #0f172a;
          color: white;
          border-color: #0f172a;
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(15,23,42,0.2);
        }

        .stores-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .stores-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
        }
        @media (min-width: 1024px) {
          .stores-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        }
        .store-card {
          background: white;
          border-radius: 28px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #020617;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 40px rgba(0,0,0,0.08);
          border: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .store-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 24px 80px rgba(59,130,246,0.2);
          border-color: rgba(59,130,246,0.2);
        }
        .store-image-container {
          width: 100%;
          aspect-ratio: 16/10;
          background: linear-gradient(145deg, #f0f9ff 0%, #faf5ff 50%, #f0fdf4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px;
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
          padding: 20px 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .store-name {
          font-size: 17px;
          font-weight: 800;
          color: #020617;
          letter-spacing: -0.02em;
        }
        .store-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          font-weight: 800;
          color: #059669;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: #d1fae5;
          padding: 6px 14px;
          border-radius: 999px;
          width: fit-content;
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .products-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
        }
        @media (min-width: 1024px) {
          .products-grid { grid-template-columns: repeat(4, 1fr); gap: 24px; }
        }
        .product-card {
          background: white;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #020617;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 6px 30px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
        }
        .product-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.12);
        }
        .product-image-container {
          width: 100%;
          aspect-ratio: 1;
          background: linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-content {
          padding: 18px 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .product-name {
          font-size: 14px;
          font-weight: 700;
          color: #020617;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        .product-price-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .product-price {
          font-size: 18px;
          font-weight: 800;
          color: #020617;
        }
        .product-mrp {
          font-size: 13px;
          color: #94a3b8;
          text-decoration: line-through;
        }

        .offers {
          background: linear-gradient(180deg, #fafafa 0%, #eff6ff 100%);
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
          aspect-ratio: 16/9;
          background: linear-gradient(135deg, #0f172a, #3b82f6, #8b5cf6);
          box-shadow: 0 30px 80px -40px rgba(59,130,246,0.5);
          transition: all 0.5s cubic-bezier(0.4,0,0.2,1);
        }
        .offer-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 40px 100px -50px rgba(59,130,246,0.6);
        }
        .offer-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(255,255,255,0.3) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(255,255,255,0.2) 0%, transparent 50%);
          pointer-events: none;
        }
        .offer-content {
          position: absolute;
          inset: 0;
          padding: 36px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          color: white;
        }
        @media (max-width: 640px) {
          .offer-content { padding: 28px 24px; }
        }
        .offer-tag {
          display: inline-flex;
          background: rgba(255,255,255,0.2);
          backdrop-filter: blur(20px);
          padding: 10px 20px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          width: fit-content;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.25);
        }
        .offer-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(26px, 4vw, 40px);
          font-weight: 800;
          margin: 0 0 12px 0;
          line-height: 1.1;
          letter-spacing: -0.03em;
        }
        .offer-desc {
          font-size: 14px;
          color: rgba(255,255,255,0.85);
          font-weight: 500;
          max-width: 360px;
        }
        .offer-btn {
          width: fit-content;
          margin-top: 28px;
          background: white;
          color: #0f172a;
          border: none;
          padding: 14px 32px;
          border-radius: 16px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .offer-btn:hover {
          transform: translateY(-3px) scale(1.05);
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        .ticker {
          background: linear-gradient(90deg, #020617 0%, #0f172a 50%, #020617 100%);
          padding: 16px 0;
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
          background: linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6);
          background-size: 200% 200%;
          animation: gradientMove 4s ease infinite;
          color: white;
          padding: 8px 24px;
          border-radius: 999px;
          font-weight: 900;
          box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
        }

        .stats {
          background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
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
            radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 40%);
          pointer-events: none;
        }
        .stats-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 50px;
          position: relative;
          z-index: 1;
        }
        @media (min-width: 768px) {
          .stats-inner { grid-template-columns: repeat(4, 1fr); gap: 60px; }
        }
        .stat-item { 
          text-align: center; 
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-item:hover {
          transform: translateY(-10px);
        }
        .stat-num {
          font-family: 'Playfair Display', serif;
          font-size: clamp(40px, 7vw, 64px);
          font-weight: 800;
          line-height: 1;
          margin-bottom: 12px;
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
              <span>Odisha's Premium Marketplace</span>
            </div>
            <h1 className="hero-title">
              Shop the Best of <span className="accent">Odisha</span>
            </h1>
            <p className="hero-desc">
              Experience premium shopping with curated products from trusted local stores. Enjoy fast delivery by Delhivery, secure payments, and exclusive deals across Odisha.
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
            <img
              src="https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80"
              alt="Premium Shopping"
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
            <h4>Delhivery Shipping</h4>
            <p>Fast & reliable delivery</p>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="section-wrapper">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow">Curated for You</span>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Discover handpicked products from our trusted sellers across Odisha</p>
            </div>
            <Link to="/products" className="section-btn">
              View All
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          <div className="products-grid">
            {products.slice(0, 8).map((product) => (
              <Link
                key={product._id}
                to={`/product/${product.slug || product._id}`}
                className="product-card"
              >
                <div className="product-image-container">
                  {product.images?.[0] ? (
                    <img
                      src={getImageUrl(product.images[0], 600)}
                      alt={product.name}
                      className="product-image"
                    />
                  ) : (
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                  )}
                </div>
                <div className="product-content">
                  <div className="product-name">{product.name}</div>
                  <div className="product-price-row">
                    <span className="product-price">₹{Number(product.price || 0).toLocaleString()}</span>
                    {product.mrp && product.mrp > product.price && (
                      <span className="product-mrp">₹{Number(product.mrp).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

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

      {/* FAQ Section */}
      <section className="section-wrapper bg-white">
        <div className="section-header">
          <div className="section-title-group">
            <span className="section-eyebrow">Got Questions?</span>
            <h2 className="section-title">Frequently Asked</h2>
            <p className="section-subtitle">Everything you need to know about shopping with SmartOdisha</p>
          </div>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden transition-all hover:border-zinc-200">
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none"
              >
                <span className="text-sm font-bold text-zinc-900">{faq.question}</span>
                <svg 
                  width="20" height="20" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24"
                  className={`text-zinc-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm text-zinc-600 font-medium leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between mb-12 pb-10 border-b border-zinc-800">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-blue-500 to-violet-600 flex items-center justify-center overflow-hidden shadow-2xl shadow-blue-900/30">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter leading-none">
                  <span className="text-emerald-400">SMART</span>
                  <span className="text-white">ODISHA</span>
                </span>
                <span className="text-[11px] font-semibold text-zinc-400 tracking-widest mt-1" style={{ 
                  background: 'linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #10b981)', 
                  backgroundSize: '300% 100%', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent', 
                  animation: 'gradientMove 5s linear infinite'
                }}>PREMIUM SHOPPING DESTINATION</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link to="/business/login" className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:shadow-lg hover:scale-105 transition-all shadow-xl shadow-emerald-900/30">
                Seller Login
              </Link>
              <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-xl border border-zinc-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Delivery by Delhivery</span>
              </div>
              <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-sm font-semibold">Email Us</span>
              </a>
              <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
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
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-5">Quick Links</h4>
              <div className="flex flex-col gap-3">
                <Link to="/products" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Shop Products</Link>
                <Link to="/about" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">About Us</Link>
                <Link to="/orders" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Track Order</Link>
                <Link to="/business/request" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Become a Seller</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-5">Support</h4>
              <div className="flex flex-col gap-3">
                <Link to="/contact" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Contact Us</Link>
                <Link to="/orders" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">My Orders</Link>
                <Link to="/wishlist" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Wishlist</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-5">Legal</h4>
              <div className="flex flex-col gap-3">
                <Link to="/privacy-policy" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Terms of Service</Link>
                <Link to="/contact" className="text-zinc-400 text-sm font-semibold hover:text-white transition-colors">Return Policy</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-5">Our Promise</h4>
              <p className="text-zinc-400 text-sm font-medium leading-relaxed">Premium quality products from verified local sellers, delivered by Delhivery across Odisha.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
            <span>© {new Date().getFullYear()} SmartOdisha. All rights reserved.</span>
            <span>Made with ❤️ in Odisha</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
