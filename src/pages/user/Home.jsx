import React, { useEffect, useRef, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CONFIG } from '../../shared/lib/config.js'
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js'
import api from '../../lib/api'
import { getCloudinaryUrl } from '../../lib/cloudinary'

function useCountUp(target, duration = 1800, start = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const num = parseFloat(target.replace(/[^0-9.]/g, ''))
    const step = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(eased * num))
      if (progress < 1) requestAnimationFrame(step)
      else setVal(num)
    }
    requestAnimationFrame(step)
  }, [start])
  return val
}

function StatItem({ n, t, delay }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const prefix = n.match(/^[₹]/) ? '₹' : ''
  const suffix = n.replace(/^[₹]?[\d.]+/, '')
  const count = useCountUp(n, 1600, visible)
  return (
    <div ref={ref} className="hm-stat" style={{ animationDelay: `${delay}ms` }}>
      <div className="hm-stat-num">{prefix}{visible ? count : 0}{suffix}</div>
      <div className="hm-stat-label">{t}</div>
    </div>
  )
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0)
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [recs, setRecs] = useState([])
  const [offers, setOffers] = useState([])
  useEffect(() => {
    const fn = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])
  useEffect(() => {
    setSEO('Wholesale Electronics Supplier India | Click2Kart', 'Buy wholesale electronics like chargers, mobiles, accessories at best B2B prices. GST invoice, fast delivery across India.')
    const cleanup = injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Click2Kart",
      "url": location.origin,
      "logo": (CONFIG.LOGO_URL || ""),
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+91-79788-80244",
        "contactType": "customer service"
      }
    })
    return cleanup
  }, [])

  const line1 = CONFIG.HERO_TITLE_LINE1 || 'Wholesale with'
  const line2 = CONFIG.HERO_TITLE_LINE2 || 'Click2Kart'

  useEffect(() => {
    setSEO('Click2Kart | India\'s Premier B2B Tech Hub', 'Direct wholesale access to top-tier electronics. GST compliant billing, bulk-only pricing, and Pan-India logistics for modern enterprises.')
    injectJsonLd({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Click2Kart",
      "url": window.location.origin,
      "logo": window.location.origin + "/logo.png",
      "description": "India's Premier B2B Tech Hub for electronics wholesale."
    })
    api.get('/api/public/categories').then(({ data }) => setCats(data || [])).catch(() => setCats([]))
    api.get('/api/brands', { params: { active: true } }).then(({ data }) => setBrands(data || [])).catch(() => setBrands([]))
    api.get('/api/recommendations/trending').then(({ data }) => setRecs(data || [])).catch(() => setRecs([]))
    api.get('/api/offers?activeOnly=true').then(({ data }) => setOffers(data || [])).catch(() => setOffers([]))
  }, [])

  const tickerLoop = useMemo(() => {
    const fromApi = (offers || [])
      .filter(o => o && (o.title || o.bannerImage))
      .map(o => ({
        key: o._id || o.title,
        label: String(o.title || 'Offer').trim(),
        pill: o.discountPercent != null && o.discountPercent !== '' ? `${o.discountPercent}% off` : 'Live offer',
      }))
    const neutral = [
      { key: 'n1', label: 'GST-ready invoicing · bulk price tiers', pill: 'B2B' },
      { key: 'n2', label: 'Pan-India dispatch on stocked SKUs', pill: 'Logistics' },
      { key: 'n3', label: 'Login for wholesale rates on the catalogue', pill: 'Secure' },
      { key: 'n4', label: 'Verified catalogue · partner onboarding', pill: 'Click2Kart' },
    ]
    const base = fromApi.length > 0 ? fromApi : neutral
    return [...base, ...base]
  }, [offers])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&display=swap');

        /* ── same variables as Partner.jsx ── */
        .hm-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #ffffff;
          color: #1e1b2e;
          overflow-x: hidden;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        /* same subtle grid as Partner */
        .hm-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.02) 1px, transparent 1px);
          background-size: 80px 80px;
          pointer-events: none; z-index: 0;
        }

        /* violet glow blobs — light, not dark */
        .hm-blob1 {
          position: fixed; top: -300px; left: 50%; transform: translateX(-50%);
          width: 1200px; height: 800px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.04), transparent 70%);
          pointer-events: none; z-index: 0;
        }
        .hm-blob2 {
          position: fixed; bottom: -200px; right: -150px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(109,40,217,0.06), transparent 65%);
          pointer-events: none; z-index: 0;
        }

        /* ────────────── HERO ────────────── */
        .hm-hero {
          position: relative;
          min-height: 100svh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 120px 24px 80px;
          overflow: hidden; z-index: 1;
        }

        /* same eyebrow pill as Partner */
        .hm-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 7px 20px; border-radius: 100px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.25);
          color: #7c3aed;
          font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
          margin-bottom: 28px;
          animation: hmFadeUp 0.7s ease both;
        }
        .hm-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7c3aed; box-shadow: 0 0 6px rgba(124,58,237,0.5);
          animation: hmPulse 2s ease infinite;
        }
        @keyframes hmPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

        /* Bebas Neue title — dark text on light bg */
        .hm-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(64px, 13vw, 150px);
          line-height: 0.92; text-align: center;
          letter-spacing: 0.01em;
          color: #1e1b2e;
          margin-bottom: 24px;
          animation: hmFadeUp 0.7s 0.1s ease both;
        }
        .hm-title .accent { color: #7c3aed; }

        .hm-sub {
          font-size: clamp(15px, 2vw, 19px);
          color: #6b7280; font-weight: 300;
          max-width: 540px; text-align: center; line-height: 1.7;
          margin-bottom: 44px;
          animation: hmFadeUp 0.7s 0.25s ease both;
        }

        .hm-ctas {
          display: flex; flex-direction: column; gap: 14px; align-items: center;
          animation: hmFadeUp 0.7s 0.4s ease both;
        }
        @media(min-width:480px) { .hm-ctas { flex-direction: row; } }

        /* Primary btn — violet (same as Partner) */
        .hm-btn-primary {
          display: inline-flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, #7c3aed, #6366f1); color: white;
          padding: 16px 40px; border-radius: 14px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.18em;
          text-decoration: none; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          position: relative; overflow: hidden;
        }
        .hm-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%); transition: transform 0.6s;
        }
        .hm-btn-primary:hover { 
          transform: translateY(-4px) scale(1.02); 
          box-shadow: 0 16px 48px rgba(124,58,237,0.45); 
        }
        .hm-btn-primary:hover::before { transform: translateX(100%); }
        .hm-btn-primary:active { transform: translateY(-1px) scale(0.97); }

        /* Secondary btn — outlined */
        .hm-btn-secondary {
          display: inline-flex; align-items: center; gap: 12px;
          border: 2px solid rgba(124,58,237,0.25);
          background: white;
          color: #7c3aed;
          padding: 16px 40px; border-radius: 14px;
          font-size: 11px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.18em;
          text-decoration: none; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(124,58,237,0.06);
        }
        .hm-btn-secondary:hover {
          background: #fdfcff;
          border-color: #7c3aed;
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(124,58,237,0.12);
        }
        .hm-btn-secondary:active { transform: translateY(-1px) scale(0.97); }

        /* Trust badge grid */
        .hm-trust-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 12px; width: 100%; max-width: 880px; margin-top: 72px;
          animation: hmFadeUp 0.7s 0.55s ease both;
        }
        @media(min-width:640px) { .hm-trust-grid { grid-template-columns: repeat(4,1fr); gap: 14px; } }

        /* same white card as Partner trust badges */
        .hm-trust-card {
          background: white;
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 18px; padding: 22px 18px;
          transition: all 0.3s; position: relative; overflow: hidden;
          box-shadow: 0 2px 12px rgba(139,92,246,0.05);
        }
        .hm-trust-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .hm-trust-card:hover { border-color: rgba(124,58,237,0.25); transform: translateY(-3px); box-shadow: 0 8px 24px rgba(124,58,237,0.1); }
        .hm-trust-card:hover::before { opacity: 1; }
        .hm-trust-icon { font-size: 26px; margin-bottom: 12px; display: block; }
        .hm-trust-title { font-size: 13px; font-weight: 700; color: #1e1b2e; margin-bottom: 5px; }
        .hm-trust-desc { font-size: 11px; color: #9ca3af; line-height: 1.5; font-weight: 400; }

        /* scroll hint */
        .hm-scroll-hint {
          position: absolute; bottom: 36px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          opacity: 0.35;
          animation: hmFadeUp 0.8s 1s ease both;
        }
        .hm-scroll-hint span { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #9ca3af; }
        .hm-scroll-line {
          width: 1px; height: 36px;
          background: linear-gradient(to bottom, #7c3aed, transparent);
          animation: hmScrollLine 1.8s ease infinite;
        }
        @keyframes hmScrollLine {
          0%{transform:scaleY(0);transform-origin:top}
          50%{transform:scaleY(1);transform-origin:top}
          51%{transform-origin:bottom}
          100%{transform:scaleY(0);transform-origin:bottom}
        }

        /* ────────────── BRANDS (logo-only) ────────────── */
        .hm-brands-inner { max-width: 1180px; margin: 0 auto; }
        .hm-brands-head { text-align: center; margin-bottom: 40px; }
        .hm-brands-kicker {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.28em;
          text-transform: uppercase; color: #7c3aed; margin-bottom: 12px;
        }
        .hm-brands-kicker::before, .hm-brands-kicker::after {
          content: ''; width: 24px; height: 1px; background: linear-gradient(90deg, transparent, rgba(124,58,237,0.5));
        }
        .hm-brands-kicker::after { background: linear-gradient(90deg, rgba(124,58,237,0.5), transparent); }
        .hm-brands-title {
          font-family: 'Bebas Neue', sans-serif; font-size: clamp(36px, 6vw, 52px);
          color: #1e1b2e; letter-spacing: 0.03em; line-height: 1.05; margin-bottom: 10px;
        }
        .hm-brands-sub { color: #6b7280; font-size: 14px; font-weight: 500; max-width: 480px; margin: 0 auto; line-height: 1.5; }
        .hm-brands-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
          gap: 14px;
        }
        @media (min-width: 640px) {
          .hm-brands-grid { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 18px; }
        }
        @media (min-width: 1024px) {
          .hm-brands-grid { grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 22px; }
        }
        .hm-brand-logo-card {
          position: relative;
          aspect-ratio: 1;
          border-radius: 22px;
          background: linear-gradient(145deg, #ffffff 0%, #faf8ff 100%);
          border: 1px solid rgba(124,58,237,0.1);
          box-shadow: 0 4px 20px rgba(76,29,149,0.06), 0 1px 0 rgba(255,255,255,0.9) inset;
          display: flex; align-items: center; justify-content: center;
          padding: 18px 16px;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.35s, border-color 0.25s;
        }
        .hm-brand-logo-card::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 30% 20%, rgba(124,58,237,0.08), transparent 55%);
          pointer-events: none; opacity: 0; transition: opacity 0.35s;
        }
        .hm-brand-logo-card:hover {
          transform: translateY(-5px) scale(1.02);
          border-color: rgba(124,58,237,0.28);
          box-shadow: 0 16px 40px rgba(124,58,237,0.14), 0 8px 24px rgba(76,29,149,0.08);
        }
        .hm-brand-logo-card:hover::after { opacity: 1; }
        .hm-brand-logo-card img {
          max-width: 100%; max-height: 100%; width: auto; height: auto;
          object-fit: contain;
          filter: grayscale(0.15) opacity(0.92);
          transition: filter 0.35s, transform 0.35s cubic-bezier(0.34, 1.2, 0.64, 1);
        }
        .hm-brand-logo-card:hover img {
          filter: grayscale(0) opacity(1);
          transform: scale(1.06);
        }
        .hm-brand-logo-fallback {
          font-size: 36px; line-height: 1; opacity: 0.35;
        }

        /* ────────────── STATS BAND ────────────── */
        .hm-stats-section {
          position: relative; z-index: 1;
          background: #7c3aed;
          padding: 56px 24px;
        }

        /* ── TICKER ── */
        .hm-ticker-section {
          background: #7c3aed;
          padding: 14px 0;
          overflow: hidden;
          position: relative;
          z-index: 10;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .hm-ticker-inner {
          display: flex;
          width: fit-content;
          animation: hmTicker 30s linear infinite;
        }
        .hm-ticker-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 40px;
          color: white;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          white-space: nowrap;
        }
        .hm-ticker-item span.highlight {
          background: white;
          color: #7c3aed;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .hm-ticker-item .fire { font-size: 16px; }

        @keyframes hmTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .hm-stats-inner {
          max-width: 880px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 36px 20px;
        }
        @media(min-width:640px) { .hm-stats-inner { grid-template-columns: repeat(4,1fr); } }

        .hm-stat { text-align: center; opacity: 0; animation: hmFadeUp 0.6s ease both; }
        .hm-stat-num {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(40px, 6vw, 64px);
          color: white; line-height: 1; letter-spacing: 0.02em;
          text-shadow: 0 2px 20px rgba(255,255,255,0.2);
        }
        .hm-stat-label {
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.2em; color: rgba(255,255,255,0.7); margin-top: 6px;
        }

        /* divider */
        .hm-divider {
          width: 100%; height: 1px; position: relative; z-index: 1;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent);
        }

        /* ────────────── FEATURES ────────────── */
        .hm-features-section {
          max-width: 1200px; margin: 0 auto;
          padding: 88px 24px; position: relative; z-index: 1;
        }

        .hm-section-label {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.25em;
          text-transform: uppercase; color: #7c3aed; margin-bottom: 16px;
        }
        .hm-section-label::before { content: ''; width: 28px; height: 1.5px; background: #7c3aed; border-radius: 2px; }

        .hm-section-heading {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 5.5vw, 68px);
          line-height: 1; letter-spacing: 0.02em; color: #1e1b2e;
          margin-bottom: 14px;
        }
        .hm-section-heading em { color: #7c3aed; font-style: normal; }

        .hm-section-sub {
          font-size: 15px; color: #6b7280; font-weight: 300;
          max-width: 460px; line-height: 1.7; margin-bottom: 56px;
        }

        /* features grid — white cards */
        .hm-features-grid {
          display: grid; grid-template-columns: 1fr;
          gap: 2px;
          background: rgba(139,92,246,0.06);
          border: 1px solid rgba(139,92,246,0.1);
          border-radius: 20px; overflow: hidden;
        }
        @media(min-width:540px) { .hm-features-grid { grid-template-columns: repeat(2,1fr); } }
        @media(min-width:900px) { .hm-features-grid { grid-template-columns: repeat(3,1fr); } }

        .hm-feature-item {
          background: white; padding: 36px 32px;
          transition: background 0.25s, box-shadow 0.25s;
          position: relative;
        }
        .hm-feature-item:hover { background: #faf8ff; box-shadow: inset 0 0 0 1px rgba(139,92,246,0.15); }
        .hm-feature-item:hover .hm-feature-num { color: #7c3aed; }

        .hm-feature-num {
          font-family: 'Bebas Neue', sans-serif; font-size: 13px;
          letter-spacing: 0.1em; color: #d1d5db; margin-bottom: 18px;
          transition: color 0.25s;
        }
        .hm-feature-icon {
          width: 46px; height: 46px; border-radius: 12px;
          background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 16px;
        }
        .hm-feature-title { font-size: 15px; font-weight: 700; color: #1e1b2e; margin-bottom: 8px; letter-spacing: -0.01em; }
        .hm-feature-desc { font-size: 13px; color: #6b7280; line-height: 1.65; font-weight: 400; }

        /* ────────────── CTA ────────────── */
        .hm-cta-section {
          max-width: 1200px; margin: 0 auto 88px;
          padding: 0 24px; position: relative; z-index: 1;
        }

        .hm-cta-inner {
          background: white;
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 28px; padding: 64px 40px;
          text-align: center; position: relative; overflow: hidden;
          box-shadow: 0 8px 50px rgba(139,92,246,0.08);
        }
        /* same top violet stripe */
        .hm-cta-inner::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent 10%, #7c3aed 50%, transparent 90%);
        }
        .hm-cta-inner::after {
          content: ''; position: absolute;
          top: -80px; left: 50%; transform: translateX(-50%);
          width: 500px; height: 280px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.06), transparent 70%);
          pointer-events: none;
        }

        /* same eyebrow pill */
        .hm-cta-badge {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.2);
          color: #7c3aed; font-size: 9px; font-weight: 700;
          letter-spacing: 0.22em; text-transform: uppercase;
          padding: 6px 18px; border-radius: 100px;
          margin-bottom: 24px; position: relative; z-index: 1;
        }

        .hm-cta-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 6vw, 72px);
          line-height: 1; letter-spacing: 0.02em; color: #1e1b2e;
          margin-bottom: 16px; position: relative; z-index: 1;
        }
        .hm-cta-title em { color: #7c3aed; font-style: normal; }

        .hm-cta-sub {
          font-size: 15px; color: #6b7280; font-weight: 300;
          max-width: 500px; margin: 0 auto 44px; line-height: 1.7;
          position: relative; z-index: 1;
        }

        .hm-cta-btns {
          display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;
          position: relative; z-index: 1;
        }

        /* ── HOW IT WORKS STEPS ── */
        .hm-steps-section {
          max-width: 1200px; margin: 0 auto 88px;
          padding: 0 24px; position: relative; z-index: 1;
        }

        .hm-steps-header { margin-bottom: 48px; }

        /* 4-step grid */
        .hm-steps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          position: relative;
        }
        @media(min-width:540px) { .hm-steps-grid { grid-template-columns: repeat(2,1fr); } }
        @media(min-width:900px) { .hm-steps-grid { grid-template-columns: repeat(4,1fr); } }

        /* connector line between cards — desktop only */
        @media(min-width:900px) {
          .hm-steps-grid::before {
            content: '';
            position: absolute;
            top: 34px; left: calc(12.5% + 20px); right: calc(12.5% + 20px);
            height: 2px;
            background: linear-gradient(90deg,
              rgba(139,92,246,0.3),
              rgba(139,92,246,0.15),
              rgba(5,150,105,0.3)
            );
            z-index: 0;
          }
        }

        .hm-step-card {
          background: white;
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 20px;
          padding: 28px 24px;
          position: relative; z-index: 1;
          transition: all 0.3s;
          box-shadow: 0 2px 16px rgba(139,92,246,0.05);
        }
        .hm-step-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          border-radius: 20px 20px 0 0;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .hm-step-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(124,58,237,0.12); border-color: rgba(124,58,237,0.25); }
        .hm-step-card:hover::before { opacity: 1; }

        .hm-step-card.s-active {
          border-color: rgba(124,58,237,0.28);
          background: linear-gradient(160deg, white 50%, #faf8ff);
          box-shadow: 0 4px 24px rgba(124,58,237,0.1);
        }
        .hm-step-card.s-active::before { opacity: 1; background: linear-gradient(90deg, transparent, #7c3aed, transparent); }

        .hm-step-card.s-done {
          border-color: rgba(5,150,105,0.22);
          background: linear-gradient(160deg, white 50%, #f0fdf4);
        }
        .hm-step-card.s-done::before { opacity: 1; background: linear-gradient(90deg, transparent, #059669, transparent); }

        .hm-step-num {
          width: 44px; height: 44px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; letter-spacing: 0.05em;
          margin-bottom: 20px;
          background: #f5f3ff; border: 2px solid rgba(139,92,246,0.18);
          color: #9ca3af;
          transition: all 0.3s;
        }
        .hm-step-card:hover .hm-step-num { border-color: rgba(124,58,237,0.4); color: #7c3aed; }
        .hm-step-card.s-active .hm-step-num { background: #7c3aed; border-color: #7c3aed; color: white; box-shadow: 0 6px 20px rgba(124,58,237,0.3); }
        .hm-step-card.s-done .hm-step-num { background: #059669; border-color: #059669; color: white; box-shadow: 0 6px 20px rgba(5,150,105,0.25); font-size: 16px; }

        .hm-step-tag-pill {
          display: inline-block;
          font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          color: #7c3aed; background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.18);
          padding: 3px 10px; border-radius: 100px;
          margin-bottom: 10px;
        }
        .hm-step-tag-pill.green { color: #059669; background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.18); }

        .hm-step-h {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 20px; color: #1e1b2e; letter-spacing: 0.03em; line-height: 1;
          margin-bottom: 10px;
        }
        .hm-step-p {
          font-size: 13px; color: #6b7280; font-weight: 400; line-height: 1.7;
        }
        .hm-step-p strong { color: #1e1b2e; font-weight: 700; }

        /* ────────────── OFFERS ────────────── */
        .hm-offers-section { max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px; position: relative; z-index: 1; }
        .hm-offers-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
        @media(min-width:768px) { .hm-offers-grid { grid-template-columns: repeat(2, 1fr); } }
        .hm-offer-card { 
          position: relative; border-radius: 24px; overflow: hidden; aspect-ratio: 16/9; 
          background: #f5f3ff; border: 1px solid rgba(124,58,237,0.1); transition: all 0.4s;
        }
        .hm-offer-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -10px rgba(124,58,237,0.25); }
        .hm-offer-img { width: 100%; height: 100%; object-fit: cover; }
        .hm-offer-content { 
          position: absolute; inset: 0; padding: 32px; 
          background: linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%);
          display: flex; flex-direction: column; justify-content: center; color: white;
        }
        .hm-offer-tag { 
          display: inline-block; width: fit-content; padding: 4px 12px; border-radius: 100px;
          background: #7c3aed; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px;
        }
        .hm-offer-title { font-family: 'Bebas Neue', sans-serif; font-size: 36px; line-height: 1; letter-spacing: 0.02em; margin-bottom: 8px; }
        .hm-offer-btn { 
          width: fit-content; padding: 10px 24px; border-radius: 12px; background: white; color: #1e1b2e;
          font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; transition: all 0.3s;
        }
        .hm-offer-card:hover .hm-offer-btn { background: #7c3aed; color: white; }

        @media(max-width:768px) {
          .hm-steps-section { margin-bottom: 60px; }
        }
          .hm-cta-section { margin-bottom: 100px; }
          .hm-cta-inner { padding: 40px 20px; }
          .hm-cta-title { font-size: clamp(32px, 9vw, 52px); }
          .hm-cta-sub { font-size: 14px; margin-bottom: 32px; }
          .hm-features-section { padding: 56px 16px; }
          .hm-hero { padding: 80px 16px 60px; }
          .hm-trust-grid { margin-top: 48px; }
          .hm-btn-primary, .hm-btn-secondary { width: 100%; justify-content: center; }
          .hm-cta-btns { flex-direction: column; align-items: center; }
          .hm-cta-btns a { width: 100%; max-width: 320px; }
        }

        @keyframes hmFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="hm-root">
        <div className="hm-blob1" />
        <div className="hm-blob2" />

        {/* ── HERO ── */}
        <section className="hm-hero">
          <div className="hm-eyebrow">
            <span className="hm-eyebrow-dot" />
            India's Trusted B2B Tech Hub
          </div>

          <h1 className="hm-title">
            <span style={{ display: 'block' }}>{line1}</span>
            <span style={{ display: 'block' }} className="accent">{line2}</span>
          </h1>

          <p className="hm-sub">{CONFIG.HERO_SUBHEAD}</p>

          <div className="hm-ctas">
            <Link to="/products" className="hm-btn-primary">
              Wholesale Catalog
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link to="/partner" className="hm-btn-secondary">
              Become a Partner
            </Link>
          </div>

          <div className="hm-trust-grid">
            {[
              { t: 'GST Invoicing',   d: 'Claim 18% ITC easily',      i: '📄' },
              { t: 'Bulk Pricing',    d: 'Up to 40% Volume Off',       i: '📦' },
              { t: 'Express Freight', d: 'Priority Pan-India Delivery',     i: '✈️' },
              { t: 'Brand Warranty',  d: '100% Genuine Authorized',    i: '🛡️' },
            ].map((f, i) => (
              <div key={i} className="hm-trust-card">
                <span className="hm-trust-icon">{f.i}</span>
                <div className="hm-trust-title">{f.t}</div>
                <div className="hm-trust-desc">{f.d}</div>
              </div>
            ))}
          </div>

          <div className="hm-scroll-hint">
            <div className="hm-scroll-line" />
            <span>Scroll</span>
          </div>
        </section>

        {/* ── BRANDS SECTION ── */}
        {brands.length > 0 && (
          <section className="hm-brands-section" style={{ padding: '88px 20px 96px', background: 'linear-gradient(180deg, #faf8ff 0%, #f3efff 50%, #faf8ff 100%)', position: 'relative', zIndex: 1 }}>
            <div className="hm-brands-inner">
              <div className="hm-brands-head">
                <div className="hm-brands-kicker">Trusted supply</div>
                <h2 className="hm-brands-title">Authorized brand partners</h2>
                <p className="hm-brands-sub">Tap a mark to open that brand&apos;s wholesale catalogue — logos only, same verified inventory.</p>
              </div>
              <div className="hm-brands-grid">
                {brands.map(b => (
                  <Link
                    key={b._id}
                    to={`/brand/${b.slug}`}
                    className="hm-brand-logo-card"
                    aria-label={`Open ${b.name} catalogue`}
                    title={b.name}
                  >
                    {b.logo
                      ? <img src={getCloudinaryUrl(b.logo, 120)} alt={b.name} loading="lazy" decoding="async" width="120" height="60" />
                      : <span className="hm-brand-logo-fallback" aria-hidden="true">✦</span>}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── TICKER: live offers from API, else neutral B2B copy (no hardcoded promos) ── */}
        <div className="hm-ticker-section">
          <div className="hm-ticker-inner">
            {tickerLoop.map((row, i) => (
              <div key={`${row.key}-${i}`} className="hm-ticker-item">
                <span className="fire">✦</span>
                <span>{row.label}</span>
                <span className="highlight">{row.pill}</span>
                <Link to="/products" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 800 }}>Catalogue</Link>
              </div>
            ))}
          </div>
        </div>

        {/* ── STATS BAND ── */}
        <section className="hm-stats-section">
          <div className="hm-stats-inner">
            {[
              { n: '500+', t: 'Active Partners',       delay: 0   },
              { n: '10+',  t: 'Crore Sales Generated', delay: 100 },
              { n: '50+',  t: 'Top Brands',        delay: 200 },
              { n: '24',   t: 'Hr B2B Support',        delay: 300 },
            ].map((s, i) => (
              <StatItem key={i} n={s.n} t={s.t} delay={s.delay} />
            ))}
          </div>
        </section>

        {/* ── OFFERS SECTION ── */}
        {offers.length > 0 && (
          <section className="hm-offers-section">
            <div className="hm-section-label">Limited Time Deals</div>
            <h2 className="hm-section-heading">🔥 Special <em>Offers</em></h2>
            <div className="hm-offers-grid">
              {offers.map(off => (
                <div key={off._id} className="hm-offer-card">
                  <img src={getCloudinaryUrl(off.bannerImage, 800)} alt={off.title} className="hm-offer-img" loading="lazy" width="800" height="400" />
                  <div className="hm-offer-content">
                    <div className="hm-offer-tag">{off.discountPercent}% OFF</div>
                    <h3 className="hm-offer-title">{off.title}</h3>
                    <Link to="/products" className="hm-offer-btn">Shop Now</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="hm-divider" />

        {/* ── FEATURES ── */}
        <section className="hm-features-section">
          <div className="hm-section-label">Why Click2Kart</div>
          <h2 className="hm-section-heading">
            Built for <em>Serious</em><br />Business
          </h2>
          <p className="hm-section-sub">
            Everything a growing B2B business needs — from flexible credit lines to dedicated account managers.
          </p>
          <div className="hm-features-grid">
            {[
              { num:'01', icon:'🏭', title:'Factory-Direct Stock',   desc:'Source directly from authorized distributors. No middlemen. Guaranteed authentic products at the best margins.' },
              { num:'02', icon:'💳', title:'B2B Credit Lines',       desc:'Flexible payment terms up to 60 days. Grow your inventory without straining your cash flow.' },
              { num:'03', icon:'📊', title:'Volume Intelligence',    desc:'Dynamic pricing that rewards scale. The more you buy, the better your margin per unit.' },
              { num:'04', icon:'🚀', title:'Priority Dispatch',      desc:'Dedicated freight lanes ensure your bulk orders ship first. Sub-48hr processing for verified partners.' },
              { num:'05', icon:'🧾', title:'Clean GST Compliance',   desc:'Every invoice is GST-ready. Maximize your input tax credit on every purchase, automatically.' },
              { num:'06', icon:'🤝', title:'Account Managers',       desc:"A dedicated human who knows your business. Not a chatbot — a real expert in your category." },
            ].map((f, i) => (
              <div key={i} className="hm-feature-item">
                <div className="hm-feature-num">{f.num}</div>
                <div className="hm-feature-icon">{f.icon}</div>
                <div className="hm-feature-title">{f.title}</div>
                <div className="hm-feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>


        <div className="hm-divider" />

        {/* ── CTA ── */}
        <section className="hm-cta-section">
          <div className="hm-cta-inner">
            <div className="hm-cta-badge">
              <span className="hm-eyebrow-dot" style={{ background: '#7c3aed', boxShadow: '0 0 6px rgba(124,58,237,0.5)' }} />
              Limited Onboarding Slots
            </div>
            <h2 className="hm-cta-title">
              Ready to <em>Transform</em><br />Your Inventory?
            </h2>
            <p className="hm-cta-sub">
              Join 500+ businesses sourcing directly from Click2Kart. Get access to credit lines,
              dedicated account managers, and exclusive factory-direct stock.
            </p>
            <div className="hm-cta-btns">
              <Link to="/signup" className="hm-btn-primary">
                Create B2B Account
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link to="/products" className="hm-btn-secondary">
                Browse Catalog
              </Link>
            </div>
          </div>
        </section>

        <div className="hm-divider" />

        {/* ── HOW IT WORKS ── */}
        <section className="hm-steps-section">
          <div className="hm-steps-header">
            <div className="hm-section-label">Simple Process</div>
            <h2 className="hm-section-heading">
              From Sign-Up to<br /><em>First Order</em> in 3 Steps
            </h2>
            <p className="hm-section-sub">
              No complicated paperwork. No long waiting periods. Just a straightforward path to India's best wholesale pricing.
            </p>
          </div>

          <div className="hm-steps-grid">

            {/* Step 1 */}
            <div className="hm-step-card s-active">
              <div className="hm-step-num">1</div>
              <div className="hm-step-tag-pill">Get Started</div>
              <div className="hm-step-h">Create Your B2B Account</div>
              <p className="hm-step-p">
                Sign up at Click2Kart in under 2 minutes. Enter your business details — <strong>no documents needed</strong> at this stage.
              </p>
            </div>

            {/* Step 2 */}
            <div className="hm-step-card">
              <div className="hm-step-num">2</div>
              <div className="hm-step-tag-pill">Activation</div>
              <div className="hm-step-h">Email Us for Activation</div>
              <p className="hm-step-p">
                Drop us an email from your registered address. Our team personally reviews and <strong>activates your account within 24 hours.</strong>
              </p>
            </div>

            {/* Step 3 */}
            <div className="hm-step-card">
              <div className="hm-step-num">3</div>
              <div className="hm-step-tag-pill">Verification</div>
              <div className="hm-step-h">Complete Quick KYC</div>
              <p className="hm-step-p">
                Submit your <strong>GST number, business PAN & address proof.</strong> Verification is guided, hassle-free, and typically done in 1–2 days.
              </p>
            </div>

            {/* Step 4 — done */}
            <div className="hm-step-card s-done">
              <div className="hm-step-num">✓</div>
              <div className="hm-step-tag-pill green">You're Live!</div>
              <div className="hm-step-h">Order at Wholesale Prices</div>
              <p className="hm-step-p">
                Access <strong>500+ products</strong> at exclusive partner pricing. Earn commissions, track referrals, and scale your business — all from one dashboard.
              </p>
            </div>

          </div>
        </section>

      </div>
    </>
  )
}
