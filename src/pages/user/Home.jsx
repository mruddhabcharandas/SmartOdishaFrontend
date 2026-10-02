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
  const [heroSlides, setHeroSlides] = useState([])
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [freeDeliveryAbove, setFreeDeliveryAbove] = useState(999)

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
    api.get('/api/public/stores').then(({ data }) => {
      const popular = data?.filter(store => store.isPopular) || []
      setStores(popular.length > 0 ? popular : (data || []))
    }).catch(() => setStores([]))
    api.get('/api/products?limit=24').then(({ data }) => setProducts(data?.items || [])).catch(() => setProducts([]))
    api.get('/api/public/hero-slides').then(({ data }) => setHeroSlides(data || [])).catch(() => setHeroSlides([]))
    api.get('/api/public/settings').then(({ data }) => {
      if (data && data.freeDeliveryAbove !== undefined) {
        setFreeDeliveryAbove(Number(data.freeDeliveryAbove))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (heroSlides.length <= 1) return
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % heroSlides.length)
    }, 4500)
    return () => clearInterval(interval)
  }, [heroSlides])

  const top10Products = useMemo(() => {
    if (!products || products.length === 0) return []
    return products.slice(0, 10)
  }, [products])

  const odishaTraditions = useMemo(() => [
    {
      id: 'sambalpuri',
      title: 'Sambalpuri & Ikat Weaves',
      odiaTitle: 'ସମ୍ବଲପୁରୀ ବସ୍ତ୍ର',
      badge: 'GI Tagged Heritage',
      desc: 'Authentic handwoven Bandha tie-and-dye sarees, kurtas & fabrics from master weavers of Western Odisha.',
      color: 'from-amber-600/90 to-red-800/95',
      accentColor: '#f59e0b',
      icon: '🥻',
      tag: 'Western Odisha Handlooms',
      search: 'Sambalpuri'
    },
    {
      id: 'tarakasi',
      title: 'Cuttack Silver Filigree',
      odiaTitle: 'କଟକ ତାରକସି',
      badge: '500+ Yrs Legacy',
      desc: 'World-renowned Tarakasi delicate wirecraft jewelry, Konark sun wheel motifs & sacred silver mementos.',
      color: 'from-slate-700/95 to-indigo-900/95',
      accentColor: '#38bdf8',
      icon: '✨',
      tag: 'Millennium City Jewelry',
      search: 'Silver'
    },
    {
      id: 'pattachitra',
      title: 'Raghurajpur Pattachitra',
      odiaTitle: 'ରଘୁରାଜପୁର ପଟ୍ଟଚିତ୍ର',
      badge: 'Ancient Storytelling',
      desc: 'Sacred mythological epics hand-painted on treated canvas and palm-leaf engravings with natural pigments.',
      color: 'from-red-700/90 to-amber-900/95',
      accentColor: '#ea580c',
      icon: '🎨',
      tag: 'Heritage Folk Art',
      search: 'Pattachitra'
    },
    {
      id: 'puri-khaja',
      title: 'Puri Jagannath Sweets',
      odiaTitle: 'ପୁରୀ ଖଜା ଓ ମିଠା',
      badge: 'Sacred Confectionery',
      desc: 'Crispy layered pheni khaja, puri gaja, and coastal Odisha delights delivered fresh with authentic temple flavours.',
      color: 'from-amber-700/90 to-orange-950/95',
      accentColor: '#fbbf24',
      icon: '🥟',
      tag: 'Coastal Odia Flavours',
      search: 'Khaja'
    },
    {
      id: 'chandua',
      title: 'Pipili Appliqué Crafts',
      odiaTitle: 'ପିପିଲି ଚାନ୍ଦୁଆ',
      badge: 'Vibrant Needlecraft',
      desc: 'Geometric handcrafted embroidered canopies, lanterns, decorative umbrellas & traditional home wall art.',
      color: 'from-rose-600/90 to-purple-900/95',
      accentColor: '#f43f5e',
      icon: '🏮',
      tag: 'Artisan Needlework',
      search: 'Applique'
    },
    {
      id: 'kandhamal',
      title: 'Kandhamal Organic Produce',
      odiaTitle: 'କନ୍ଧମାଳ ହଳଦୀ',
      badge: 'GI Tagged Pure Forest',
      desc: 'Medicinal high-curcumin organic golden turmeric, raw Mayurbhanj forest honey & wild tribal spices.',
      color: 'from-emerald-700/90 to-teal-950/95',
      accentColor: '#10b981',
      icon: '🌿',
      tag: 'Tribal Co-op Organics',
      search: 'Organic'
    }
  ], [])

  const tickerLoop = useMemo(() => {
    const neutral = [
      { key: 'n1', label: `Free Delivery Across Odisha on Orders Above ₹${freeDeliveryAbove}`, pill: 'FREE SHIPPING' },
      { key: 'n2', label: '100% Genuine Handlooms & Certified Local Crafts', pill: 'ODISHA PRIDE' },
      { key: 'n3', label: 'Cash on Delivery Available Across All 30 Districts', pill: 'CASH ON DELIVERY' },
      { key: 'n4', label: '7-Day Easy & Transparent Returns', pill: 'HASSLE-FREE' }
    ]
    return [...neutral, ...neutral]
  }, [freeDeliveryAbove])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="home-root min-h-screen">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cinzel:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .home-root {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: #fdfbf7;
          color: #0f172a;
        }

        .top-ticker {
          background: linear-gradient(90deg, #7c2d12, #991b1b, #1e1b4b, #0f172a);
          color: #fef3c7;
          padding: 8px 20px;
          font-size: 11.5px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          border-bottom: 1px solid rgba(245, 158, 11, 0.25);
        }
        @media (max-width: 640px) {
          .top-ticker { justify-content: center; text-align: center; gap: 8px; font-size: 11px; }
        }
        .ticker-right { display: flex; gap: 10px; }
        .ticker-link { color: #fef08a; text-decoration: none; font-weight: 700; transition: all 0.2s; padding: 5px 14px; border-radius: 100px; background: rgba(254, 240, 138, 0.15); font-size:11px; letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid rgba(254, 240, 138, 0.3); }
        .ticker-link:hover { background: rgba(254, 240, 138, 0.25); transform: translateY(-1px); }

        .hero {
          color: white;
          padding: 70px 20px 90px;
          position: relative;
          overflow: hidden;
          background: 
            radial-gradient(circle at 85% 20%, rgba(220, 38, 38, 0.22) 0%, transparent 50%),
            radial-gradient(circle at 15% 80%, rgba(217, 119, 6, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.5) 0%, transparent 70%),
            linear-gradient(135deg, #090d16 0%, #0f172a 35%, #1e1b4b 75%, #2c121e 100%);
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -150px;
          left: 50%;
          transform: translateX(-50%);
          width: 850px;
          height: 520px;
          border-radius: 50%;
          background: radial-gradient(ellipse, rgba(245, 158, 11, 0.12), transparent 65%);
          pointer-events: none;
        }
        .hero-inner {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 36px;
          position: relative;
          z-index: 1;
        }
        .hero-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 820px;
        }
        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          backdrop-filter: blur(10px);
          border-radius: 100px;
          font-size: 11px;
          font-weight: 800;
          width: fit-content;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #fde68a;
          box-shadow: 0 4px 15px rgba(217, 119, 6, 0.15);
        }
        .hero-eyebrow span.dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
        .hero-title {
          font-family: 'Cinzel', 'Bebas Neue', serif;
          font-size: clamp(34px, 5.5vw, 62px);
          line-height: 1.15;
          letter-spacing: 0.02em;
          color: #ffffff;
          font-weight: 800;
        }
        .hero-title .accent {
          background: linear-gradient(90deg, #fcd34d, #f59e0b, #fb7185, #fcd34d);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradient 8s ease infinite;
        }
        .hero-odia-subtitle {
          font-size: 16px;
          color: #fde68a;
          font-weight: 600;
          letter-spacing: 0.05em;
          margin-top: -6px;
        }
        .hero-desc {
          font-size: 15px;
          line-height: 1.65;
          color: #cbd5e1;
          max-width: 620px;
          font-weight: 400;
        }
        @media (max-width: 640px) {
          .hero-desc { font-size: 13.5px; }
          .hero-odia-subtitle { font-size: 14px; }
        }
        .hero-search {
          display: flex;
          width: 100%;
          max-width: 600px;
          gap: 0px;
          margin-top: 6px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          border-radius: 16px;
        }
        .hero-search-input {
          flex: 1;
          padding: 16px 20px;
          border-radius: 16px 0 0 16px;
          border: 1px solid rgba(254, 240, 138, 0.25);
          border-right: none;
          outline: none;
          font-size: 14px;
          font-weight: 500;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(14px);
          color: white;
          transition: all 0.3s;
        }
        .hero-search-input::placeholder {
          color: #94a3b8;
        }
        .hero-search-input:focus {
          background: rgba(15, 23, 42, 0.85);
          border-color: rgba(245, 158, 11, 0.6);
        }
        .hero-search-btn {
          padding: 16px 28px;
          border-radius: 0 16px 16px 0;
          border: none;
          background: linear-gradient(135deg, #b45309, #d97706, #b91c1c);
          color: white;
          font-weight: 800;
          font-size: 11.5px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 24px rgba(180, 83, 9, 0.35);
        }
        .hero-search-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(180, 83, 9, 0.5);
          background: linear-gradient(135deg, #d97706, #b45309, #991b1b);
        }
        .hero-quick-tags {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .hero-quick-label {
          font-size: 11px;
          font-weight: 700;
          color: #fcd34d;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .hero-quick-pill {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(254, 240, 138, 0.2);
          color: #f1f5f9;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hero-quick-pill:hover {
          background: rgba(245, 158, 11, 0.25);
          border-color: #f59e0b;
          color: #fef08a;
          transform: translateY(-2px);
        }
        .hero-cta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 4px;
        }
        .btn-primary {
          background: linear-gradient(135deg, #b45309, #b91c1c, #991b1b);
          color: white;
          border: 1px solid rgba(254, 240, 138, 0.3);
          padding: 14px 28px;
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
          box-shadow: 0 8px 24px rgba(185, 28, 28, 0.35);
        .btn-primary:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 30px rgba(185, 28, 28, 0.45);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.08);
          color: white;
          border: 1px solid rgba(255,255,255,0.15);
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
          backdrop-filter: blur(10px);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .btn-secondary:hover {
          border-color: #6366f1;
          background: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          width: 100%;
        }
        .hero-image {
          width: 100%;
          max-width: 800px;
          height: auto;
          border-radius: 28px;
          box-shadow: 0 20px 60px -20px rgba(79,70,229,0.3);
          transition: all 0.5s ease;
          animation: float 6s ease-in-out infinite;
        }
        .hero-image:hover {
          transform: scale(1.03);
          box-shadow: 0 30px 80px -30px rgba(79,70,229,0.4);
        }

        .hero-slider-container {
          width: 100%;
          max-width: 800px;
          aspect-ratio: 16/9;
          border-radius: 28px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 20px 60px -20px rgba(79,70,229,0.3);
          animation: float 6s ease-in-out infinite;
          background: rgba(255,255,255,0.05);
        }
        .hero-slider-container:hover {
          transform: scale(1.02);
          box-shadow: 0 30px 80px -30px rgba(79,70,229,0.4);
        }
        .hero-slide {
          position: absolute;
          inset: 0;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .hero-slide.active {
          opacity: 1;
          z-index: 10;
        }
        .hero-slide-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .hero-slide-title-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.85));
          color: white;
          padding: 24px;
          font-weight: 800;
          font-size: 16px;
          z-index: 20;
          text-align: left;
          letter-spacing: 0.02em;
        }


        .features {
          max-width: 1280px;
          margin: 0 auto;
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
          border: 1px solid rgba(79,70,229,0.1);
          border-radius: 18px;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 12px rgba(79,70,229,0.04);
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
        .feature-card::before { content: ''; position: absolute; top:0; left:0; right:0; height:2px; background: linear-gradient(90deg, transparent, rgba(79,70,229,0.2), transparent); opacity:0; transition: opacity 0.2s; }
        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 6px 24px rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.2);
        }
        .feature-card:hover::before { opacity:1; }
        .feature-icon {
          width: 56px;
          height: 56px;
          background: #eef2ff;
          border: 1px solid rgba(99,102,241,0.1);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .feature-icon svg { width: 24px; height: 24px; color: #4f46e5; }
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
          color: #4f46e5;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-eyebrow::before { content: ''; width: 20px; height: 2px; background: rgba(79,70,229,0.35); border-radius: 2px; }
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
          border: 1px solid rgba(79,70,229,0.15);
          border-radius: 12px;
          color: #4f46e5;
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
          background: #4f46e5;
          color: white;
          border-color: #4f46e5;
          transform: translateY(-2px);
        }

        /* Odisha Theme Badges & Helpers */
        .odisha-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: rgba(217, 119, 6, 0.1);
          border: 1px solid rgba(217, 119, 6, 0.25);
          border-radius: 100px;
          color: #b45309;
          font-weight: 800;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .odisha-badge span.dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #d97706;
          box-shadow: 0 0 6px #d97706;
        }

        /* ──── ODISHA TRADITIONS SHOWCASE ──── */
        .traditions-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: 16px;
        }
        @media (min-width: 640px) {
          .traditions-grid { grid-template-columns: repeat(2, 1fr); gap: 18px; }
        }
        @media (min-width: 1024px) {
          .traditions-grid { grid-template-columns: repeat(3, 1fr); gap: 20px; }
        }
        .tradition-card {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          background: white;
          border: 1px solid rgba(217, 119, 6, 0.18);
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .tradition-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(180, 83, 9, 0.18);
          border-color: #f59e0b;
        }
        .tradition-header {
          padding: 24px 22px 18px;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .tradition-header::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 100% 0%, rgba(255,255,255,0.2) 0%, transparent 60%);
          pointer-events: none;
        }
        .tradition-icon-badge {
          font-size: 32px;
          margin-bottom: 12px;
          display: inline-block;
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
        }
        .tradition-gi-tag {
          display: inline-block;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.35);
          backdrop-filter: blur(8px);
          padding: 3px 10px;
          border-radius: 100px;
          margin-bottom: 8px;
        }
        .tradition-odia-title {
          font-size: 13px;
          color: #fef3c7;
          font-weight: 700;
          margin-bottom: 2px;
          letter-spacing: 0.03em;
        }
        .tradition-title {
          font-family: 'Cinzel', 'Plus Jakarta Sans', serif;
          font-size: 19px;
          font-weight: 800;
          color: white;
          margin: 0;
          line-height: 1.25;
          letter-spacing: 0.02em;
        }
        .tradition-body {
          padding: 18px 22px 20px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 12px;
          background: #ffffff;
        }
        .tradition-desc {
          font-size: 12.5px;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }
        .tradition-cta {
          margin-top: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #b45309;
          transition: all 0.2s;
        }
        .tradition-card:hover .tradition-cta {
          color: #d97706;
          gap: 10px;
        }

        /* ──── TOP 10 SELLING PRODUCTS ──── */
        .top10-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px) {
          .top10-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
        }
        @media (min-width: 1024px) {
          .top10-grid { grid-template-columns: repeat(5, 1fr); gap: 18px; }
        }
        .top10-card {
          background: white;
          border: 1px solid rgba(217, 119, 6, 0.16);
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          text-decoration: none;
          color: #0f172a;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
          display: flex;
          flex-direction: column;
          position: relative;
        }
        .top10-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 30px rgba(180, 83, 9, 0.14);
          border-color: #f59e0b;
        }
        .card-out-of-stock {
          opacity: 0.85;
        }
        .top10-rank-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 10;
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 9.5px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .rank-gold {
          background: linear-gradient(135deg, #d97706, #f59e0b, #b45309);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .rank-silver {
          background: linear-gradient(135deg, #334155, #64748b, #475569);
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(71, 85, 105, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .rank-bronze {
          background: linear-gradient(135deg, #9a3412, #c2410c, #7c2d12);
          color: #ffffff;
          box-shadow: 0 4px 10px rgba(194, 65, 12, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .rank-standard {
          background: rgba(15, 23, 42, 0.82);
          backdrop-filter: blur(8px);
          color: #fde68a;
          border: 1px solid rgba(254, 240, 138, 0.3);
        }
        .top10-image-container {
          width: 100%;
          aspect-ratio: 1;
          background: #fafaf9;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 16px;
        }
        .top10-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 0.4s ease;
        }
        .top10-card:hover .top10-image {
          transform: scale(1.06);
        }
        .top10-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .top10-discount-pill {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #dc2626;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.35);
        }
        .top10-content {
          padding: 14px 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1;
        }
        .top10-seller {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 700;
          color: #b45309;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .top10-seller-icon {
          font-size: 11px;
        }
        .top10-title {
          font-size: 13.5px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
        }
        .top10-rating-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
        }
        .top10-stars {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: #d97706;
          font-weight: 800;
        }
        .top10-stars .star-icon {
          color: #f59e0b;
          font-size: 12px;
        }
        .rating-count {
          color: #94a3b8;
          font-size: 10.5px;
        }
        .top10-stock-out {
          margin-left: auto;
          font-size: 9.5px;
          font-weight: 800;
          color: #b91c1c;
          background: #fee2e2;
          padding: 1px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .top10-stock-low {
          margin-left: auto;
          font-size: 9.5px;
          font-weight: 800;
          color: #c2410c;
          background: #ffedd5;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .top10-price-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-top: 2px;
        }
        .top10-price {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #b91c1c;
          letter-spacing: 0.02em;
        }
        .top10-mrp {
          font-size: 12px;
          color: #94a3b8;
          text-decoration: line-through;
        }
        .top10-action-btn {
          margin-top: 6px;
          padding: 8px 12px;
          border-radius: 10px;
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .top10-card:hover .top10-action-btn {
          background: #b45309;
          color: #ffffff;
          border-color: #b45309;
        }

        /* ──── CATALOG SEE MORE CTA BANNER ──── */
        .catalog-see-more-banner {
          background: 
            radial-gradient(circle at 10% 20%, rgba(217, 119, 6, 0.25) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(185, 28, 28, 0.25) 0%, transparent 40%),
            linear-gradient(135deg, #111827 0%, #1e1b4b 50%, #2b1122 100%);
          border: 1px solid rgba(245, 158, 11, 0.35);
          border-radius: 24px;
          padding: 36px 32px;
          color: white;
          margin-top: 36px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.15);
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .catalog-see-more-banner { flex-direction: row; text-align: left; }
        }
        .catalog-see-more-content {
          max-width: 650px;
        }
        .catalog-see-more-badge {
          display: inline-flex;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #fde68a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          padding: 4px 12px;
          border-radius: 100px;
          margin-bottom: 10px;
        }
        .catalog-see-more-title {
          font-family: 'Cinzel', 'Plus Jakarta Sans', serif;
          font-size: clamp(20px, 3vw, 28px);
          font-weight: 800;
          color: #ffffff;
          margin: 0 0 8px;
          line-height: 1.25;
        }
        .catalog-see-more-desc {
          font-size: 13.5px;
          color: #cbd5e1;
          margin: 0;
          line-height: 1.55;
        }
        .catalog-see-more-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706, #b45309);
          color: white;
          padding: 16px 32px;
          border-radius: 14px;
          font-weight: 800;
          font-size: 12.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.45);
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .catalog-see-more-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 14px 32px rgba(217, 119, 6, 0.6);
        }

        /* ──── POPULAR SELLERS (BOUTIQUE MERCHANT CARDS) ──── */
        .boutique-stores-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }
        @media (min-width: 640px) {
          .boutique-stores-grid { grid-template-columns: repeat(3, 1fr); gap: 18px; }
        }
        @media (min-width: 1024px) {
          .boutique-stores-grid { grid-template-columns: repeat(4, 1fr); gap: 22px; }
        }
        .boutique-store-card {
          background: white;
          border: 1px solid rgba(217, 119, 6, 0.16);
          border-radius: 22px;
          overflow: hidden;
          text-decoration: none;
          display: flex;
          flex-direction: column;
          transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
          position: relative;
        }
        .boutique-store-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 36px rgba(180, 83, 9, 0.15);
          border-color: #f59e0b;
        }
        .boutique-store-banner {
          height: 80px;
          background: linear-gradient(135deg, #7c2d12, #991b1b, #1e1b4b);
          position: relative;
          display: flex;
          justify-content: flex-end;
          padding: 8px 12px;
        }
        .boutique-banner-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 60%);
          pointer-events: none;
        }
        .boutique-state-pill {
          position: relative;
          z-index: 1;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: #fef08a;
          background: rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(4px);
          padding: 3px 8px;
          border-radius: 100px;
          height: fit-content;
          border: 1px solid rgba(254, 240, 138, 0.3);
        }
        .boutique-avatar-wrapper {
          display: flex;
          justify-content: center;
          margin-top: -40px;
          position: relative;
          z-index: 2;
        }
        .boutique-avatar-ring {
          width: 78px;
          height: 78px;
          border-radius: 50%;
          background: white;
          padding: 3px;
          border: 2.5px solid #f59e0b;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .boutique-avatar-img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }
        .boutique-avatar-fallback {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #fef3c7, #fde68a);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .boutique-initial {
          color: #92400e;
          font-weight: 900;
          font-size: 24px;
          font-family: 'Cinzel', serif;
        }
        .boutique-content {
          padding: 14px 16px 18px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          flex: 1;
        }
        .boutique-name {
          font-size: 14.5px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          line-height: 1.3;
        }
        .boutique-badges-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
          margin-top: 2px;
        }
        .boutique-verified-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9.5px;
          font-weight: 700;
          color: #047857;
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 2px 7px;
          border-radius: 100px;
        }
        .boutique-city-badge {
          display: inline-flex;
          align-items: center;
          font-size: 9.5px;
          font-weight: 700;
          color: #92400e;
          background: #fef3c7;
          border: 1px solid #fde68a;
          padding: 2px 7px;
          border-radius: 100px;
        }
        .boutique-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.45;
          margin: 4px 0 6px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .boutique-action {
          margin-top: auto;
          padding: 7px 14px;
          border-radius: 10px;
          background: #fff7ed;
          border: 1px solid #fed7aa;
          color: #c2410c;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .boutique-store-card:hover .boutique-action {
          background: #ea580c;
          color: white;
          border-color: #ea580c;
        }

        .offers {
          background: #f8fafc;
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
          background: linear-gradient(135deg, #0f172a, #1e3a8a, #4f46e5);
          box-shadow: 0 4px 16px rgba(30,58,138,0.15);
          transition: all 0.3s ease;
        }
        .offer-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(99,102,241,0.25);
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
          color: #4f46e5;
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
          color: #4f46e5;
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
          background: linear-gradient(90deg, #0f172a, #1e3a8a, #4f46e5);
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
          color: #4f46e5;
          padding: 6px 18px;
          border-radius: 100px;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .stats {
          background: linear-gradient(135deg, #0f172a, #1e3a8a, #4f46e5);
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
          border-top: 1px solid rgba(79,70,229,0.1);
        }
      `}</style>


      {/* Top Ticker */}
      <div className="top-ticker">
        <span>✦ 100% Authentic Odisha Crafts & Handlooms • Fast Delivery Across All 30 Districts • Cash on Delivery</span>
        <div className="ticker-right">
          <Link to="/orders" className="ticker-link">Track Order</Link>
          <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="ticker-link">24/7 Support</a>
        </div>
      </div>

      {/* Hero */}
      <section className="hero relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl floating"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-600/15 rounded-full blur-3xl floating" style={{ animationDelay: '3s' }}></div>
        </div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <span className="dot"></span>
              <span>THE PRIDE OF UTKALA • ଓଡ଼ିଶାର ନିଜସ୍ଵ ମାର୍କେଟପ୍ଲେସ୍</span>
            </div>
            
            <h1 className="hero-title">
              Experience The Soul of <span className="accent">Odisha</span>
            </h1>
            
            <div className="hero-odia-subtitle">
              ଓଡ଼ିଶାର ଶ୍ରେଷ୍ଠ କାରିଗରୀ, ବସ୍ତ୍ର ଓ ଉତ୍ପାଦ ଏବେ ଆପଣଙ୍କ ଦ୍ୱାରରେ
            </div>

            <p className="hero-desc">
              Direct from master Sambalpuri weavers, Cuttack silver filigree artisans, Raghurajpur folk painters, Puri confectionery masters, and trusted merchants across all 30 districts of Odisha.
            </p>

            {/* Hero Search */}
            <form onSubmit={handleSearch} className="hero-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Sambalpuri sarees, Cuttack silver filigree, Pattachitra, Puri khaja..."
                className="hero-search-input"
              />
              <button type="submit" className="hero-search-btn">
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search</span>
              </button>
            </form>

            {/* Quick Suggestions */}
            <div className="hero-quick-tags">
              <span className="hero-quick-label">Trending Now:</span>
              {[
                { label: '🥻 Sambalpuri Saree', q: 'Sambalpuri' },
                { label: '✨ Tarakasi Silver', q: 'Silver' },
                { label: '🎨 Pattachitra Art', q: 'Pattachitra' },
                { label: '🥟 Puri Khaja', q: 'Khaja' },
                { label: '🌿 Kandhamal Haldi', q: 'Organic' }
              ].map((tag, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigate(`/products?search=${encodeURIComponent(tag.q)}`)}
                  className="hero-quick-pill"
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <div className="hero-cta">
              <Link to="/products" className="btn-primary">
                Explore All Products
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link to="/about" className="btn-secondary">
                Our Story & Heritage
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="hero-right">
            {heroSlides.length > 0 ? (
              <div className="hero-slider-container">
                {heroSlides.map((slide, idx) => (
                  <div
                    key={slide._id}
                    className={`hero-slide ${idx === currentSlideIndex ? 'active' : ''}`}
                    onClick={() => slide.link && navigate(slide.link)}
                    style={{ cursor: slide.link ? 'pointer' : 'default' }}
                  >
                    <img src={slide.image?.url || slide.image} alt={slide.title || 'Slide'} className="hero-slide-img" />
                    {slide.title && (
                      <div className="hero-slide-title-overlay">
                        {slide.title}
                      </div>
                    )}
                  </div>
                ))}
                {heroSlides.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {heroSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentSlideIndex(idx); }}
                        className={`w-2 h-2 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                        style={{ border: 'none', padding: 0, cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <img src="/banner.jpeg" alt="SmartOdisha Banner" className="hero-image" />
            )}
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="features">
        <div className="feature-card">
          <div className="feature-icon" style={{ background: '#fef3c7', color: '#b45309' }}>
            <span style={{ fontSize: '24px' }}>🚀</span>
          </div>
          <div className="feature-text">
            <h4>All 30 Districts</h4>
            <p>Fast doorstep delivery across Odisha</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: '#fee2e2', color: '#b91c1c' }}>
            <span style={{ fontSize: '24px' }}>🥻</span>
          </div>
          <div className="feature-text">
            <h4>100% Genuine Heritage</h4>
            <p>Direct from verified artisans & stores</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: '#ecfdf5', color: '#047857' }}>
            <span style={{ fontSize: '24px' }}>💵</span>
          </div>
          <div className="feature-text">
            <h4>Cash on Delivery</h4>
            <p>Pay when order arrives safely</p>
          </div>
        </div>
        <div className="feature-card">
          <div className="feature-icon" style={{ background: '#eff6ff', color: '#1d4ed8' }}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
          </div>
          <div className="feature-text">
            <h4>7-Day Easy Returns</h4>
            <p>Hassle-free guarantee & support</p>
          </div>
        </div>
      </section>

      {/* ──── ODISHA TRADITIONS & HERITAGE SHOWCASE ──── */}
      <section className="section-wrapper odisha-traditions-section">
        <div className="section-header">
          <div className="section-title-group">
            <span className="section-eyebrow odisha-badge">
              <span className="dot"></span>
              <span>✨ HERITAGE & CRAFTS • ଓଡ଼ିଶାର ଐତିହ୍ୟ ଓ ପରମ୍ପରା</span>
            </span>
            <h2 className="section-title">Treasures & Traditions of Odisha</h2>
            <p className="section-subtitle">
              Explore iconic GI-tagged crafts, legendary weaves, sacred temple delicacies, and tribal forest riches
            </p>
          </div>
          <Link to="/products" className="section-btn hidden sm:inline-flex">
            Browse All Traditions
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="traditions-grid">
          {odishaTraditions.map((tradition) => (
            <Link
              key={tradition.id}
              to={`/products?search=${encodeURIComponent(tradition.search)}`}
              className="tradition-card"
            >
              <div className={`tradition-header bg-gradient-to-br ${tradition.color}`}>
                <div className="flex items-center justify-between">
                  <span className="tradition-icon-badge">{tradition.icon}</span>
                  <span className="tradition-gi-tag">{tradition.badge}</span>
                </div>
                <div className="tradition-odia-title">{tradition.odiaTitle}</div>
                <h3 className="tradition-title">{tradition.title}</h3>
              </div>
              <div className="tradition-body">
                <p className="tradition-desc">{tradition.desc}</p>
                <div className="tradition-cta">
                  <span>Explore Collection</span>
                  <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ──── TOP 10 SELLING PRODUCTS ──── */}
      {top10Products.length > 0 && (
        <section className="section-wrapper top-products-section">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow odisha-badge">
                <span className="dot"></span>
                <span>🔥 TOP BESTSELLERS • ସର୍ବାଧିକ ବିକ୍ରିତ ଉତ୍ପାଦ</span>
              </span>
              <h2 className="section-title">Top 10 Best Selling Products</h2>
              <p className="section-subtitle">
                Most loved authentic treasures, handlooms, and everyday favourites ordered by customers across Odisha
              </p>
            </div>
            <Link to="/products" className="section-btn hidden sm:inline-flex">
              View All Products
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          <div className="top10-grid">
            {top10Products.map((product, index) => {
              const rank = index + 1
              const rankClass = rank === 1 ? 'rank-gold' : rank === 2 ? 'rank-silver' : rank === 3 ? 'rank-bronze' : 'rank-standard'
              const rankLabel = rank === 1 ? '👑 #1 BESTSELLER' : rank === 2 ? '🥈 #2 TRENDING' : rank === 3 ? '🥉 #3 HOT PICK' : `#${rank} CHOICE`
              const discount = product.discountPercent || (product.mrp && product.price && product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0)
              const isOutOfStock = product.stock !== undefined && product.stock <= 0

              return (
                <Link
                  key={product._id}
                  to={`/product/${product.slug || product._id}`}
                  className={`top10-card ${isOutOfStock ? 'card-out-of-stock' : ''}`}
                >
                  {/* Rank Ribbon */}
                  <div className={`top10-rank-badge ${rankClass}`}>
                    {rankLabel}
                  </div>

                  {/* Product Image */}
                  <div className="top10-image-container">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={getImageUrl(product.images[0]?.url || product.images[0], 500)}
                        alt={product.name}
                        className="top10-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="top10-placeholder">
                        <svg width="48" height="48" fill="none" stroke="#cbd5e1" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                      </div>
                    )}
                    {discount > 0 && (
                      <span className="top10-discount-pill">
                        {discount}% OFF
                      </span>
                    )}
                  </div>

                  {/* Product Content */}
                  <div className="top10-content">
                    {/* Merchant Tag */}
                    <div className="top10-seller">
                      <span className="top10-seller-icon">📍</span>
                      <span className="truncate">{product.storeName || 'SmartOdisha Verified'}</span>
                    </div>

                    {/* Product Name */}
                    <h3 className="top10-title" title={product.name}>
                      {product.name}
                    </h3>

                    {/* Ratings */}
                    <div className="top10-rating-row">
                      <div className="top10-stars">
                        <span className="star-icon">★</span>
                        <span className="rating-val">{product.ratingAvg > 0 ? product.ratingAvg.toFixed(1) : '4.8'}</span>
                      </div>
                      <span className="rating-count">({product.ratingCount || 15}+ reviews)</span>
                      {isOutOfStock ? (
                        <span className="top10-stock-out">Out of stock</span>
                      ) : product.stock !== undefined && product.stock <= 5 ? (
                        <span className="top10-stock-low">Only {product.stock} left</span>
                      ) : null}
                    </div>

                    {/* Pricing */}
                    <div className="top10-price-row">
                      <div className="top10-price">₹{product.price?.toLocaleString('en-IN')}</div>
                      {product.mrp && product.mrp > product.price && (
                        <div className="top10-mrp">₹{product.mrp?.toLocaleString('en-IN')}</div>
                      )}
                    </div>

                    {/* CTA button */}
                    <div className="top10-action-btn">
                      <span>View Details</span>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Catalog CTA ("See More") */}
          <div className="catalog-see-more-banner">
            <div className="catalog-see-more-content">
              <div className="catalog-see-more-badge">
                <span>✦ COMPLETE ODISHA MARKETPLACE</span>
              </div>
              <h3 className="catalog-see-more-title">
                Explore Over 1,000+ Authentic Odisha Creations
              </h3>
              <p className="catalog-see-more-desc">
                From handcrafted Sambalpuri silk to filigree jewelry, temple sweets, tribal forest delicacies, and everyday essentials — shop direct from local creators.
              </p>
            </div>
            <Link to="/products" className="catalog-see-more-btn">
              <span>Explore Full Catalog (1,000+ Products)</span>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* ──── POPULAR SELLERS (BOUTIQUE MERCHANTS) ──── */}
      {stores.length > 0 && (
        <section className="section-wrapper popular-sellers-section">
          <div className="section-header">
            <div className="section-title-group">
              <span className="section-eyebrow odisha-badge">
                <span className="dot"></span>
                <span>🏛️ VERIFIED LOCAL MERCHANTS • ପ୍ରତିଷ୍ଠିତ ବ୍ୟବସାୟୀ</span>
              </span>
              <h2 className="section-title">Popular Odisha Sellers</h2>
              <p className="section-subtitle">
                Support authentic regional artisans, heritage boutiques, and verified local stores across Odisha
              </p>
            </div>
          </div>

          <div className="boutique-stores-grid">
            {stores.map((store) => {
              const avatarSrc = store.sellerAvatar?.url || store.logo || store.image?.url
              const city = store.address?.city || 'Odisha'

              return (
                <Link
                  key={store._id}
                  to={`/products?store=${store._id}`}
                  className="boutique-store-card"
                >
                  {/* Card Header Pattern Banner */}
                  <div className="boutique-store-banner">
                    <div className="boutique-banner-pattern"></div>
                    <span className="boutique-state-pill">ODISHA VERIFIED</span>
                  </div>

                  {/* Overlapping Circular Avatar */}
                  <div className="boutique-avatar-wrapper">
                    <div className="boutique-avatar-ring">
                      {avatarSrc ? (
                        <img
                          src={getImageUrl(avatarSrc, 400)}
                          alt={store.name}
                          className="boutique-avatar-img"
                        />
                      ) : (
                        <div className="boutique-avatar-fallback">
                          <span className="boutique-initial">
                            {store.name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Store Details */}
                  <div className="boutique-content">
                    <h3 className="boutique-name" title={store.name}>
                      {store.name}
                    </h3>

                    <div className="boutique-badges-row">
                      <span className="boutique-verified-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Verified Partner
                      </span>
                      <span className="boutique-city-badge">
                        📍 {city}
                      </span>
                    </div>

                    <p className="boutique-desc">
                      Authentic local craftsmanship & premium collections directly from trusted Odisha merchant.
                    </p>

                    {/* Action Link */}
                    <div className="boutique-action">
                      <span>Visit Store</span>
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </Link>
              )
            })}
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
      <footer className="bg-white border-t border-indigo-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-10 items-start lg:items-center justify-between mb-12 pb-10 border-b border-indigo-50">
            <div className="flex items-center gap-5">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center overflow-hidden shadow-2xl shadow-indigo-900/10">
                <img
                  src="/logo.png"
                  alt="SmartOdisha"
                  className="h-full w-full object-contain p-2"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter leading-none">
                  <span className="text-indigo-700">SMART</span>
                  <span className="text-blue-600">ODISHA</span>
                </span>
                <span className="text-[11px] font-semibold text-gray-400 tracking-widest mt-1" style={{ 
                  background: 'linear-gradient(90deg, #3b82f6, #6366f1, #8b5cf6, #3b82f6)', 
                  backgroundSize: '300% 100%', 
                  WebkitBackgroundClip: 'text', 
                  WebkitTextFillColor: 'transparent', 
                  animation: 'gradientMove 5s linear infinite'
                }}>PREMIUM SHOPPING DESTINATION</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <Link to="/business/login" className="px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-xl text-white text-xs font-black uppercase tracking-widest hover:shadow-lg hover:scale-105 transition-all shadow-xl shadow-indigo-900/20">
                Seller Login
              </Link>
              <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <span className="text-sm font-semibold">Email Us</span>
              </a>
              <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.646.917 5.082 2.477 7.053L0 24l5.247-1.342C7.317 23.678 9.585 24 12 24c6.627 0 12-5.373 12-12 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-semibold">WhatsApp</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-10">
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Quick Links</h4>
              <div className="flex flex-col gap-3">
                <Link to="/products" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Shop Products</Link>
                <Link to="/about" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">About Us</Link>
                <Link to="/orders" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Track Order</Link>
                <Link to="/business/request" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Become a Seller</Link>
              </div>
            </div>
            
            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Support & Help</h4>
              <div className="flex flex-col gap-3">
                <a href={`mailto:${CONFIG.SUPPORT_EMAIL}`} className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">
                  Customer Support
                </a>
                <a href={`https://wa.me/${CONFIG.SUPPORT_WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">
                  WhatsApp Support (24/7)
                </a>
                <Link to="/orders" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Track Orders</Link>
                <Link to="/wishlist" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">My Wishlist</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Legal & Governance</h4>
              <div className="flex flex-col gap-3">
                <Link to="/leadership" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Leadership & Management</Link>
                <Link to="/privacy-policy" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Privacy Policy</Link>
                <Link to="/terms-of-service" className="text-gray-600 text-sm font-semibold hover:text-indigo-600 transition-colors">Terms of Service</Link>
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-5">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://instagram.com/smartodisha.in?igsh=N3c3NnlhOGVmZXho" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                </a>
                <a href="https://facebook.com/share/18EgsKKhie/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12.073c0 6.001 4.388 10.966 10.125 11.855v-8.383h-3.047v-3.472h3.047V9.413c0-3.007 1.789-4.668 4.533-4.668 1.31 0 2.686.238 2.686.238v2.953h-1.514c-1.488 0-1.952.925-1.952 1.874v2.256h3.321l-.531 3.472h-2.79v8.383c5.736-.889 10.125-5.854 10.125-11.855z"/>
                  </svg>
                </a>
                <a href="https://linkedin.com/in/Smart-Odisha-774a30415?utm_source=share_via&utm_content=profile&utm_medium=member_android" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554V14.89c0-1.337-.026-3.057-1.86-3.057-1.864 0-2.151 1.453-2.151 2.963v5.647H9.322V9h3.414v1.561h.046c.477-.9 1.637-1.859 3.37-1.859 3.601 0 4.268 2.37 4.268 5.455v6.295zM5.337 7.433a2.06 2.06 0 0 1-2.063-2.065c0-1.141.92-2.064 2.063-2.064 1.142 0 2.064.923 2.064 2.064 0 1.142-.922 2.065-2.064 2.065zM7.105 20.452H3.568V9h3.537v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-semibold text-gray-500 uppercase tracking-widest pt-6 border-t border-indigo-50">
            <span>© {new Date().getFullYear()} SmartOdisha. All rights reserved.</span>
            <span>Made with ❤️ in Odisha</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
