import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { getImageUrl } from '../../lib/cloudinary';
import { useCart, getStockStatus } from '../../lib/CartContext';
import { useWishlist } from '../../lib/WishlistContext';
import { setSEO, injectJsonLd } from '../../shared/lib/seo.js';
import { useToast } from '../../components/Toast';
import RecommendationModal from '../../components/RecommendationModal';
import ProductCard from '../../components/ProductCard';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../lib/AuthContext';

function sortVariantValues(lowKey, values) {
  const arr = [...values];
  const storageLike = /ram|rom|storage|memory|capacity|variant|model/i.test(lowKey) && !/screen|display|camera|inch|hz|refresh/i.test(lowKey);
  if (storageLike) {
    return arr.sort((a, b) => {
      const na = parseFloat(String(a).replace(/[^\d.]/g, '')) || 0;
      const nb = parseFloat(String(b).replace(/[^\d.]/g, '')) || 0;
      if (na !== nb) return na - nb;
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
    });
  }
  return arr.sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Satoshi:wght@300;400;500;600;700&display=swap');

  :root {
    --bg: #f7f6f3;
    --bg2: #eeecea;
    --card: #ffffff;
    --ink: #111118;
    --ink2: #3a3a48;
    --ink3: #888896;
    --ink4: #b8b8c4;
    --border: #e4e2de;
    --border2: #d0cdc8;
    --orange: #e85b1a;
    --orange-dim: rgba(232,91,26,0.10);
    --orange-glow: rgba(232,91,26,0.18);
    --green: #1a9e6e;
    --green-dim: rgba(26,158,110,0.10);
    --red: #d63843;
    --yellow: #d4920a;
    --yellow-dim: rgba(212,146,10,0.10);
    --navy: #1e2d5a;
    --r-sm: 12px;
    --r-md: 18px;
    --r-lg: 24px;
    --r-xl: 32px;
    --shadow-sm: 0 1px 4px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05);
    --t: 0.2s cubic-bezier(0.4,0,0.2,1);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .pd { font-family: 'Satoshi', system-ui, sans-serif; background: var(--bg); color: var(--ink); min-height: 100vh; }

  /* ── Topbar ── */
  .pd-nav {
    position: sticky; top: 0; z-index: 50;
    background: rgba(247,246,243,0.92);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid var(--border);
    padding: 0 16px;
    height: 52px;
    display: flex; align-items: center; gap: 12px;
  }
  .pd-nav-back {
    width: 36px; height: 36px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--card);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--ink2);
    transition: var(--t);
    flex-shrink: 0;
  }
  .pd-nav-back:hover { background: var(--bg2); border-color: var(--border2); }
  .pd-nav-title { font-size: 14px; font-weight: 600; color: var(--ink); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pd-nav-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .pd-nav-btn {
    width: 36px; height: 36px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--card);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--ink2);
    transition: var(--t);
  }
  .pd-nav-btn:hover { background: var(--bg2); }
  .pd-nav-btn.active { color: var(--red); background: rgba(214,56,67,0.08); border-color: rgba(214,56,67,0.2); }

  @media (min-width: 768px) {
    .pd-nav { display: none; }
  }

  /* ── Breadcrumb ── */
  .pd-bc {
    display: none;
    align-items: center; gap: 6px;
    padding: 20px 24px 0;
    max-width: 1280px; margin: 0 auto;
    font-size: 12.5px; font-weight: 500; color: var(--ink3);
    flex-wrap: wrap;
  }
  .pd-bc a { color: var(--ink3); text-decoration: none; transition: color var(--t); }
  .pd-bc a:hover { color: var(--orange); }
  .pd-bc-sep { color: var(--ink4); }
  @media (min-width: 768px) { .pd-bc { display: flex; } }

  /* ── Main Layout ── */
  .pd-main {
    max-width: 1280px; margin: 0 auto;
    padding: 12px 12px 120px;
    display: flex; flex-direction: column; gap: 12px;
  }
  @media (min-width: 768px) {
    .pd-main { padding: 24px 24px 80px; gap: 24px; }
  }
  @media (min-width: 1024px) {
    .pd-main {
      display: grid;
      grid-template-columns: minmax(0, 480px) 1fr;
      grid-template-rows: auto;
      gap: 32px;
      align-items: start;
    }
    .pd-left-col { grid-column: 1; grid-row: 1 / 99; }
    .pd-right-col { grid-column: 2; display: flex; flex-direction: column; gap: 16px; }
  }

  /* ── Card base ── */
  .pd-card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .pd-card-body { padding: 16px; }
  @media (min-width: 768px) { .pd-card-body { padding: 20px; } }

  /* ── Image Gallery ── */
  .pd-gallery { display: flex; flex-direction: column; gap: 10px; }

  .pd-stage {
    position: relative;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    aspect-ratio: 1;
    cursor: zoom-in;
  }
  @media (min-width: 768px) { .pd-stage { border-radius: var(--r-xl); } }

  .pd-stage-img {
    width: 100%; height: 100%;
    object-fit: contain;
    padding: 28px;
    transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
    display: block;
  }
  .pd-stage:hover .pd-stage-img { transform: scale(1.05); }

  .pd-stage-no-img {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--ink4);
  }

  .pd-badge-off {
    position: absolute; top: 14px; left: 14px;
    background: var(--orange); color: #fff;
    font-size: 12px; font-weight: 800;
    padding: 5px 11px; border-radius: 8px;
    letter-spacing: 0.04em;
    box-shadow: 0 3px 10px rgba(232,91,26,0.35);
  }



  .pd-img-skeleton {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, #f0efec 25%, #e6e4e0 50%, #f0efec 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  /* Thumbs */
  .pd-thumbs {
    display: flex; gap: 8px;
    overflow-x: auto; padding: 2px;
    scrollbar-width: none;
  }
  .pd-thumbs::-webkit-scrollbar { display: none; }
  .pd-thumb {
    width: 68px; height: 68px; flex-shrink: 0;
    background: var(--card);
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm);
    overflow: hidden; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: var(--t); padding: 6px;
  }
  .pd-thumb:hover { border-color: var(--border2); }
  .pd-thumb.on { border-color: var(--orange); box-shadow: 0 0 0 3px var(--orange-dim); }
  .pd-thumb img { width: 100%; height: 100%; object-fit: contain; }

  /* Dots */
  .pd-dots { display: flex; justify-content: center; gap: 6px; padding: 2px 0; }
  .pd-dot { width: 6px; height: 6px; border-radius: 3px; background: var(--border2); border: none; cursor: pointer; transition: var(--t); padding: 0; }
  .pd-dot.on { background: var(--orange); width: 18px; }

  /* ── Product Info Card ── */
  .pd-info { display: flex; flex-direction: column; gap: 0; }

  .pd-brand-strip {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.16em;
    color: var(--orange); margin-bottom: 8px;
  }
  .pd-brand-strip::before { content:''; width:16px; height:2px; background:var(--orange); border-radius:2px; }

  .pd-title {
    font-family: 'Clash Display', 'Satoshi', sans-serif;
    font-size: clamp(22px, 4.5vw, 34px);
    font-weight: 700; color: var(--ink);
    line-height: 1.15; letter-spacing: -0.01em;
    margin-bottom: 14px;
  }

  .pd-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .pd-rating {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--green); color: #fff;
    font-size: 12px; font-weight: 700;
    padding: 4px 10px; border-radius: 7px;
  }
  .pd-rating-ct { font-size: 12.5px; font-weight: 500; color: var(--ink3); }
  .pd-assured {
    font-size: 10px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--navy);
    background: rgba(30,45,90,0.07);
    padding: 4px 10px; border-radius: 6px;
    border: 1px solid rgba(30,45,90,0.12);
  }

  /* Price Section */
  .pd-price-block {
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid var(--border);
  }
  .pd-price-lbl {
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.14em;
    color: var(--green); margin-bottom: 6px;
  }
  .pd-price-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
  .pd-price {
    font-family: 'Clash Display', sans-serif;
    font-size: clamp(36px, 7vw, 52px);
    font-weight: 700; color: var(--ink);
    line-height: 1; letter-spacing: -0.02em;
  }
  .pd-price-mrp {
    font-size: 17px; font-weight: 500;
    color: var(--ink4); text-decoration: line-through;
  }
  .pd-save {
    background: var(--green-dim); color: var(--green);
    font-size: 12px; font-weight: 800;
    padding: 4px 10px; border-radius: 20px;
  }
  .pd-tax { font-size: 11.5px; color: var(--ink3); font-weight: 500; margin-top: 5px; }

  /* Stock */
  .pd-stock {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px; border-radius: 9px;
    font-size: 12.5px; font-weight: 700;
    margin-top: 14px;
  }
  .pd-stock.in { background: var(--green-dim); color: var(--green); }
  .pd-stock.low { background: var(--yellow-dim); color: var(--yellow); }
  .pd-stock.out { background: rgba(214,56,67,0.08); color: var(--red); }
  .pd-stock-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }

  /* ── Divider Label ── */
  .pd-dlabel {
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.15em;
    color: var(--ink3);
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 14px;
  }
  .pd-dlabel::after { content:''; flex:1; height:1px; background:var(--border); }

  /* ── Seller Card ── */
  .pd-seller-inner {
    display: flex; align-items: center; gap: 14px;
    padding: 14px 16px;
  }
  @media (min-width: 768px) { .pd-seller-inner { padding: 16px 20px; } }

  .pd-seller-av {
    width: 48px; height: 48px; border-radius: 13px;
    border: 1px solid var(--border);
    overflow: hidden; flex-shrink: 0;
    background: var(--bg2);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
  }
  .pd-seller-av img { width: 100%; height: 100%; object-fit: cover; }
  .pd-seller-info { flex: 1; min-width: 0; }
  .pd-seller-lbl { font-size: 10.5px; font-weight: 700; color: var(--ink3); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 2px; }
  .pd-seller-name { font-size: 14px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pd-verified {
    flex-shrink: 0;
    font-size: 10.5px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.1em;
    color: var(--green);
    background: var(--green-dim);
    border: 1px solid rgba(26,158,110,0.2);
    padding: 6px 12px; border-radius: 8px;
    display: flex; align-items: center; gap: 4px;
  }

  /* ── Variants ── */
  .pd-var-section { padding: 14px 16px 16px; }
  @media (min-width: 768px) { .pd-var-section { padding: 16px 20px 20px; } }
  .pd-var-row { display: flex; flex-direction: column; gap: 14px; }
  .pd-var-lbl { font-size: 13px; font-weight: 700; color: var(--ink2); margin-bottom: 10px; }
  .pd-var-lbl span { color: var(--ink3); font-weight: 500; margin-left: 4px; }
  .pd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .pd-chip {
    padding: 8px 16px;
    border: 1.5px solid var(--border);
    background: var(--bg);
    color: var(--ink2);
    font-size: 13px; font-weight: 600;
    border-radius: 9px; cursor: pointer;
    transition: var(--t); font-family: inherit;
    line-height: 1;
  }
  .pd-chip:hover:not(.disabled):not(.on) { border-color: var(--border2); background: var(--card); }
  .pd-chip.on { border-color: var(--orange); background: var(--orange-dim); color: var(--orange); font-weight: 700; }
  .pd-chip.disabled { opacity: 0.35; cursor: not-allowed; }
  .pd-chip-col { display: flex; align-items: center; gap: 8px; }
  .pd-col-dot { width: 13px; height: 13px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,0.10); flex-shrink: 0; }

  /* ── Delivery ── */
  .pd-del-body { padding: 14px 16px 16px; }
  @media (min-width: 768px) { .pd-del-body { padding: 16px 20px 20px; } }

  .pd-addr-card {
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: var(--r-sm);
    padding: 12px 14px;
  }
  .pd-addr-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px; }
  .pd-addr-lbl2 { font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.12em; color: var(--ink3); }
  .pd-addr-change { background: none; border: none; color: var(--orange); font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .pd-addr-change:hover { opacity: 0.8; }
  .pd-addr-val { font-size: 13.5px; font-weight: 600; color: var(--ink); }

  .pd-pin-row { display: flex; gap: 8px; }
  .pd-pin-input {
    flex: 1; padding: 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 14px; font-weight: 600; font-family: inherit;
    outline: none; background: var(--bg); color: var(--ink);
    transition: var(--t);
  }
  .pd-pin-input:focus { border-color: var(--orange); background: var(--card); box-shadow: 0 0 0 3px var(--orange-dim); }
  .pd-pin-btn {
    padding: 11px 18px;
    background: var(--ink); color: #fff;
    border: none; border-radius: 10px;
    font-size: 13px; font-weight: 700; font-family: inherit;
    cursor: pointer; transition: var(--t); white-space: nowrap;
  }
  .pd-pin-btn:hover:not(:disabled) { background: var(--orange); }
  .pd-pin-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .pd-del-result {
    margin-top: 12px; padding: 12px 14px;
    border-radius: 11px; font-size: 13px;
  }
  .pd-del-result.ok { background: var(--green-dim); color: var(--green); }
  .pd-del-result.fail { background: rgba(214,56,67,0.08); color: var(--red); }
  .pd-del-eta { font-weight: 700; display: flex; align-items: center; gap: 6px; margin-bottom: 0; }

  /* ── Tabs ── */
  .pd-tabs-wrap { padding: 14px 16px 0; }
  @media (min-width: 768px) { .pd-tabs-wrap { padding: 16px 20px 0; } }
  .pd-tabs {
    display: flex; gap: 2px;
    background: var(--bg2); border-radius: 11px; padding: 4px;
    margin-bottom: 16px;
  }
  .pd-tab {
    flex: 1; padding: 8px 6px;
    border: none; background: none;
    font-size: 12px; font-weight: 700;
    color: var(--ink3); border-radius: 8px;
    cursor: pointer; font-family: inherit;
    transition: var(--t); text-align: center;
  }
  .pd-tab.on { background: var(--card); color: var(--ink); box-shadow: var(--shadow-sm); }
  .pd-tab:hover:not(.on) { color: var(--ink2); }

  .pd-tab-body { padding: 0 16px 16px; }
  @media (min-width: 768px) { .pd-tab-body { padding: 0 20px 20px; } }

  .pd-highlights { list-style: none; display: flex; flex-direction: column; gap: 7px; }
  .pd-hi {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 12px;
    background: var(--bg); border-radius: 10px;
    font-size: 13px; color: var(--ink2); font-weight: 500; line-height: 1.5;
  }
  .pd-hi-icon { color: var(--green); margin-top: 1px; flex-shrink: 0; }

  .pd-desc {
    font-size: 13.5px; color: var(--ink2); line-height: 1.75; font-weight: 400;
    overflow: hidden;
  }
  .pd-readmore {
    background: none; border: none; color: var(--orange);
    font-size: 12.5px; font-weight: 700; cursor: pointer;
    font-family: inherit; padding: 8px 0 0;
    display: inline-flex; align-items: center; gap: 4px;
  }

  .pd-specs { width: 100%; border-collapse: collapse; }
  .pd-specs tr { border-bottom: 1px solid var(--border); }
  .pd-specs tr:last-child { border-bottom: none; }
  .pd-specs td { padding: 10px 0; vertical-align: top; font-size: 13px; }
  .pd-specs .sk { width: 40%; color: var(--ink3); font-weight: 500; padding-right: 12px; }
  .pd-specs .sv { color: var(--ink2); font-weight: 600; }

  /* ── CTA Buttons (inline in right col, visible on desktop too) ── */
  .pd-cta {
    display: flex; gap: 10px;
  }
  .pd-btn-cart {
    flex: 1; padding: 15px 14px;
    background: var(--ink); color: #fff;
    border: none; border-radius: var(--r-sm);
    font-size: 14px; font-weight: 700; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 4px 16px rgba(17,17,24,0.18);
    letter-spacing: 0.01em;
  }
  .pd-btn-cart:hover:not(:disabled) { background: #22222f; transform: translateY(-2px); box-shadow: 0 8px 28px rgba(17,17,24,0.22); }

  .pd-btn-buy {
    flex: 1; padding: 15px 14px;
    background: linear-gradient(135deg, var(--orange) 0%, #bf4210 100%);
    color: #fff;
    border: none; border-radius: var(--r-sm);
    font-size: 14px; font-weight: 700; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
    box-shadow: 0 4px 16px var(--orange-glow);
    letter-spacing: 0.01em;
  }
  .pd-btn-buy:hover:not(:disabled) { background: linear-gradient(135deg, #bf4210 0%, var(--orange) 100%); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(232,91,26,0.32); }
  .pd-btn-cart:disabled, .pd-btn-buy:disabled { background: var(--bg2); color: var(--ink4); box-shadow: none; cursor: not-allowed; transform: none; }

  /* ── Mobile Sticky CTA ── */
  .pd-sticky-cta {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
    background: rgba(247,246,243,0.96);
    backdrop-filter: blur(16px);
    border-top: 1px solid var(--border);
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    display: flex; gap: 10px;
  }
  @media (min-width: 768px) { .pd-sticky-cta { display: none; } }

  .pd-mob-cart {
    flex: 1; padding: 14px;
    background: var(--ink); color: #fff;
    border: none; border-radius: var(--r-sm);
    font-size: 14px; font-weight: 700; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: var(--t);
  }
  .pd-mob-cart:hover:not(:disabled) { background: #22222f; }

  .pd-mob-buy {
    flex: 1; padding: 14px;
    background: var(--orange); color: #fff;
    border: none; border-radius: var(--r-sm);
    font-size: 14px; font-weight: 700; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
    transition: var(--t);
  }
  .pd-mob-buy:hover:not(:disabled) { background: #bf4210; }
  .pd-mob-cart:disabled, .pd-mob-buy:disabled { background: var(--bg2); color: var(--ink4); cursor: not-allowed; }

  /* ── Hide desktop CTA on mobile ── */
  .pd-desktop-cta { display: none; }
  @media (min-width: 768px) { .pd-desktop-cta { display: flex; } }

  /* ── Recommendations ── */
  .pd-recs-wrap {
    max-width: 1280px; margin: 0 auto;
    padding: 0 12px 140px;
  }
  @media (min-width: 768px) { .pd-recs-wrap { padding: 0 24px 80px; } }

  .pd-recs-hd {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 16px;
  }
  .pd-recs-title {
    font-family: 'Clash Display', sans-serif;
    font-size: 20px; font-weight: 700;
    color: var(--ink); letter-spacing: -0.01em;
    white-space: nowrap;
  }
  @media (min-width: 768px) { .pd-recs-title { font-size: 24px; } }
  .pd-recs-line { flex: 1; height: 1px; background: var(--border); }

  .pd-recs-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  @media (min-width: 540px) { .pd-recs-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; } }
  @media (min-width: 900px) { .pd-recs-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; } }

  /* ProductCard override — compact & square in recs grid */
  .pd-recs-grid > * {
    min-width: 0 !important;
  }

  /* ── Lightbox ── */
  .pd-lb {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(10,10,15,0.97);
    backdrop-filter: blur(24px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .pd-lb img { max-width: 90vw; max-height: 88vh; object-fit: contain; border-radius: var(--r-lg); }
  .pd-lb-close {
    position: absolute; top: 18px; right: 18px;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff; font-size: 20px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: var(--t); backdrop-filter: blur(8px);
  }
  .pd-lb-close:hover { background: rgba(255,255,255,0.18); }

  /* ── Loading / Error ── */
  .pd-loading {
    min-height: 100vh; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
  }
  .pd-error {
    min-height: 100vh; background: var(--bg);
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .pd-error-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--r-xl); padding: 40px 32px;
    text-align: center; max-width: 360px; width: 100%;
    box-shadow: var(--shadow-lg);
  }
  .pd-error-emoji { font-size: 52px; margin-bottom: 20px; }
  .pd-error-h { font-family: 'Clash Display', sans-serif; font-size: 26px; font-weight: 700; margin-bottom: 10px; }
  .pd-error-p { font-size: 14px; color: var(--ink3); line-height: 1.6; margin-bottom: 28px; }
  .pd-error-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 28px;
    background: var(--ink); color: #fff;
    border-radius: var(--r-sm);
    font-size: 13px; font-weight: 700;
    text-decoration: none; transition: var(--t);
  }
  .pd-error-btn:hover { background: var(--orange); }
`;

export default function ProductDetail() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, refreshCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { notify } = useToast();
  const { user, isAuthenticated, refreshProfile } = useAuth();

  const { data: p, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['product', idOrSlug, user?._id],
    queryFn: () => api.get(`/api/products/${idOrSlug}`).then(res => res.data),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
  });

  useEffect(() => {
    if (isAuthenticated) refreshProfile();
  }, [isAuthenticated, refreshProfile]);

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['recommendations', idOrSlug],
    queryFn: async () => {
      try {
        const res = await api.get(`/api/products/${idOrSlug}/recommendations?limit=8`);
        if (res.data && res.data.length > 0) return res.data;
        const fb = await api.get('/api/products?limit=8');
        return fb.data?.items || [];
      } catch {
        try { const fb = await api.get('/api/products?limit=8'); return fb.data?.items || []; }
        catch { return []; }
      }
    },
    enabled: !!idOrSlug,
    staleTime: 1000 * 60 * 60,
  });

  const normalizeAttrs = (attrs, sku = '', productAttributes = []) => {
    const result = {};
    if (attrs && typeof attrs === 'object') {
      const obj = attrs instanceof Map ? Object.fromEntries(attrs) : attrs;
      Object.entries(obj).forEach(([k, v]) => {
        if (k && k !== 'sku') result[k.toLowerCase().trim()] = String(v || '').trim();
      });
    }
    const targetSku = sku || (attrs && typeof attrs === 'object' ? attrs.sku : null);
    if (Object.keys(result).length === 0 && targetSku) {
      const parts = String(targetSku).split('-').map(s => s.trim()).filter(Boolean);
      const attrKeys = (Array.isArray(productAttributes) ? productAttributes : [])
        .map(a => a.split(':')[0]?.toLowerCase().trim()).filter(Boolean);
      if (parts.length >= 2) {
        if (attrKeys.length > 0) {
          attrKeys.forEach((key, idx) => { if (parts[idx + 1]) result[key] = parts[idx + 1].toLowerCase(); });
        } else {
          result.model = parts[1].toLowerCase();
          if (parts.length >= 3) result.variant = parts.slice(2).join('-').toLowerCase();
        }
      }
    }
    return result;
  };

  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [imgLoading, setImgLoading] = useState(true);
  const [activeVariant, setActiveVariant] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [recItems, setRecItems] = useState([]);
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [pincode, setPincode] = useState('');
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('highlights');

  const variantAttrs = useMemo(() => {
    if (!p) return [];
    const ordered = [];
    const seen = new Set();
    const add = (rawKey) => {
      if (!rawKey || typeof rawKey !== 'string') return;
      const lk = rawKey.toLowerCase().trim();
      if (!lk || seen.has(lk)) return;
      seen.add(lk);
      ordered.push(rawKey.trim());
    };
    const attrs = Array.isArray(p.attributes) ? p.attributes : [];
    attrs.forEach(a => { const parts = a.split(':'); if (parts[0]) add(parts[0].trim()); });
    const extras = [];
    if (Array.isArray(p.variants)) {
      p.variants.forEach(v => {
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
        Object.keys(vAttrs || {}).forEach(k => {
          if (!k || typeof k !== 'string') return;
          const lk = k.toLowerCase().trim();
          if (!seen.has(lk)) extras.push(k.trim());
        });
      });
    }
    const uniqExtra = [...new Map(extras.map(e => [e.toLowerCase().trim(), e])).values()];
    uniqExtra.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    uniqExtra.forEach(add);
    if (ordered.length === 0 && Array.isArray(p.variants) && p.variants.length > 0) return ['Option'];
    return ordered;
  }, [p]);

  const matchedVariant = useMemo(() => {
    if (!p || !p.variants || !Array.isArray(p.variants) || !p.variants.length) return null;
    if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') {
      const val = selected['option'];
      if (!val) return null;
      return p.variants.find(v => v.isActive !== false && (v.sku === val || v._id === val)) || null;
    }
    return p.variants.find(v => {
      if (v.isActive === false) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
      return variantAttrs.every(attr => {
        const lowAttr = attr.toLowerCase().trim();
        const val = selected[lowAttr];
        if (!val) return false;
        let matchVal = false;
        Object.entries(vAttrs).forEach(([vk, vv]) => {
          if (vk.toLowerCase().trim() === lowAttr && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) matchVal = true;
        });
        return matchVal;
      });
    });
  }, [p, selected, variantAttrs]);

  const safeNum = (val) => { const n = Number(val); return isNaN(n) || !isFinite(n) ? 0 : n; };

  const minPrice = useMemo(() => {
    if (!p) return 0;
    let base;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      base = safeNum(p.originalStorePrice ?? p.price ?? 0);
    } else {
      const av = p.variants.filter(v => v.isActive !== false && safeNum(v.originalStorePrice ?? v.price ?? 0) > 0);
      base = av.length === 0 ? safeNum(p.originalStorePrice ?? p.price ?? 0) : Math.min(...av.map(v => safeNum(v.originalStorePrice ?? v.price ?? 0)));
    }
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [p]);

  const currentPrice = useMemo(() => {
    const base = matchedVariant ? safeNum(matchedVariant.originalStorePrice ?? matchedVariant.price ?? 0) : safeNum(p?.originalStorePrice ?? p?.price ?? 0);
    return base * (1 + safeNum(p?.store?.storePercentage ?? 0) / 100);
  }, [matchedVariant, p]);

  const currentMrp = useMemo(() => {
    const base = matchedVariant ? safeNum(matchedVariant.mrp ?? 0) : safeNum(p?.mrp ?? 0);
    return base;
  }, [matchedVariant, p]);

  const currentStock = matchedVariant?.stock ?? p?.stock;
  const isAvailable = currentStock > 0;

  const displayMrp = useMemo(() => {
    if (!p) return 0;
    let base;
    if (!Array.isArray(p.variants) || p.variants.length === 0) {
      base = safeNum(p.mrp ?? p.originalStorePrice ?? p.price ?? 0);
    } else {
      const av = p.variants.filter(v => v.isActive !== false && safeNum(v.originalStorePrice ?? v.price ?? 0) > 0);
      if (av.length === 0) { base = safeNum(p.mrp ?? p.originalStorePrice ?? p.price ?? 0); }
      else {
        const minVar = av.reduce((a, b) => safeNum(a.originalStorePrice ?? a.price ?? 0) < safeNum(b.originalStorePrice ?? b.price ?? 0) ? a : b);
        base = safeNum(minVar?.mrp ?? p.mrp ?? 0);
      }
    }
    return base;
  }, [p, minPrice]);

  const discount = displayMrp > minPrice ? Math.round(((displayMrp - minPrice) / displayMrp) * 100) : 0;
  const totalStock = p && Array.isArray(p.variants) && p.variants.length > 0
    ? p.variants.filter(v => v.isActive !== false).reduce((sum, v) => sum + (v.stock || 0), 0)
    : (p?.stock || 0);

  const stockStRaw = getStockStatus(currentStock ?? totalStock);
  const stockSt = { ...stockStRaw, text: String(stockStRaw.text || '').includes('Only') ? 'Limited Stock' : stockStRaw.text };

  const canAddToCart =
    (variantAttrs.length === 0 || (variantAttrs.every(attr => !!selected[attr.toLowerCase().trim()]) && !!matchedVariant)) &&
    isAvailable &&
    (!deliveryInfo || deliveryInfo.serviceable);

  const hasHighlights = p && Array.isArray(p.highlights) && p.highlights.length > 0;
  const hasSpecifications = p && Array.isArray(p.specifications) && p.specifications.length > 0;
  const hasDescription = p?.description?.length > 0;

  useEffect(() => { setImgLoading(true); }, [activeImg, activeVariant, matchedVariant]);

  const imgs = useMemo(() => {
    if (matchedVariant?.images?.length > 0) return matchedVariant.images;
    return Array.isArray(p?.images) ? p.images : [];
  }, [p, matchedVariant]);

  const touchImgRef = useRef({ x0: 0, y0: 0, active: false });
  const skipMainImgClickRef = useRef(false);
  const onMainImgTouchStart = useCallback((e) => {
    if (imgs.length <= 1) return;
    const t = e.touches[0];
    touchImgRef.current = { x0: t.clientX, y0: t.clientY, active: true };
  }, [imgs.length]);
  const onMainImgTouchEnd = useCallback((e) => {
    if (!touchImgRef.current.active || imgs.length <= 1) return;
    touchImgRef.current.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchImgRef.current.x0;
    const dy = t.clientY - touchImgRef.current.y0;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    skipMainImgClickRef.current = true;
    window.setTimeout(() => { skipMainImgClickRef.current = false; }, 450);
    if (dx < 0) setActiveImg(i => Math.min(imgs.length - 1, i + 1));
    else setActiveImg(i => Math.max(0, i - 1));
  }, [imgs.length]);
  const onMainImgTouchCancel = useCallback(() => { touchImgRef.current.active = false; }, []);
  const onMainImgClick = useCallback(() => { if (skipMainImgClickRef.current) return; setLightbox(true); }, []);

  useEffect(() => {
    if (user?.savedAddresses && user.savedAddresses.length > 0) {
      const def = user.savedAddresses.find(a => a.isDefault) || user.savedAddresses[0];
      setSelectedAddress(def);
      if (def?.pincode) { setPincode(def.pincode); checkDeliveryImpl(def.pincode); }
    } else if (user?.address) {
      const m = user.address.match(/\b(\d{6})\b/);
      if (m) { setPincode(m[1]); checkDeliveryImpl(m[1]); }
    }
  }, [user?.savedAddresses, user?.address]);

  useEffect(() => {
    if (pincode.length === 6) checkDeliveryImpl(pincode);
  }, [currentPrice, minPrice, pincode]);

  const checkDeliveryImpl = async (code, weight = (p?.weight || 500) / 1000, orderAmount = currentPrice || minPrice) => {
    if (code.length !== 6) return;
    setCheckingDelivery(true);
    try {
      const serviceRes = await api.get(`/api/shipping/check-pincode`, { params: { pincode: code, order_amount: orderAmount, store_id: p?.store?._id || p?.store } });
      const [prepaidCalcRes, codCalcRes] = await Promise.all([
        api.post(`/api/shipping/calculate`, { destination_pin: code, weight, order_amount: orderAmount, payment_method: 'prepaid', store_id: p?.store?._id || p?.store }),
        api.post(`/api/shipping/calculate`, { destination_pin: code, weight, order_amount: orderAmount, payment_method: 'cod', store_id: p?.store?._id || p?.store })
      ]);
      const eta = serviceRes.data.eta || 3;
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      setDeliveryInfo({
        serviceable: serviceRes.data.delivery_available,
        codAvailable: serviceRes.data.cod_available,
        message: serviceRes.data.delivery_available ? 'Delivery available' : 'Not available',
        etaStart: addDays(now, eta),
        etaEnd: addDays(now, eta + 2),
        deliveryCharge: prepaidCalcRes.data.delivery_charge,
        codCharge: codCalcRes.data.cod_charge,
        codFinalCharge: codCalcRes.data.final_charge,
        isFreeDelivery: prepaidCalcRes.data.final_charge === 0
      });
    } catch {
      const now = new Date();
      const addDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
      const isFree = (currentPrice || minPrice) >= 999;
      const codCharge = Math.min(Math.max(Math.round((currentPrice || minPrice) * 0.05), 40), 100);
      setDeliveryInfo({ serviceable: true, message: 'Delivery available', etaStart: addDays(now, 3), etaEnd: addDays(now, 5), deliveryCharge: 85, codCharge, codFinalCharge: 85 + codCharge, isFreeDelivery: isFree });
    } finally { setCheckingDelivery(false); }
  };

  const checkDelivery = (e) => { e?.preventDefault(); checkDeliveryImpl(pincode); };

  useEffect(() => {
    if (p) setError(null);
    if (queryError) {
      const msg = queryError?.response?.data?.error || queryError.message || 'Product not found';
      setError(msg === 'not_found' ? 'This product is no longer available.' : msg);
    }
  }, [p, queryError]);

  useEffect(() => {
    if (!p) return;
    if (!Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }
    const params = new URLSearchParams(location.search);
    const initialSelected = {};
    let hasParams = false;
    variantAttrs.forEach(attr => {
      const lowAttr = attr.toLowerCase().trim();
      const val = params.get(lowAttr);
      if (val) { initialSelected[lowAttr] = val; hasParams = true; }
    });
    if (hasParams) { setSelected(initialSelected); return; }
    if (Object.keys(selected).length === 0) {
      const bestVariant = [...p.variants].filter(v => v.isActive !== false).sort((a, b) => (b.stock || 0) - (a.stock || 0))[0];
      if (bestVariant) {
        if (variantAttrs.length === 1 && variantAttrs[0] === 'Option') setSelected({ option: bestVariant.sku || bestVariant._id });
        else setSelected(normalizeAttrs(bestVariant.attributes, bestVariant.sku));
      }
    }
  }, [p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    const params = new URLSearchParams(location.search);
    let changed = false;
    Object.entries(selected).forEach(([k, v]) => { if (v && params.get(k) !== v) { params.set(k, v); changed = true; } });
    const selectedKeys = Object.keys(selected);
    Array.from(params.keys()).forEach(pk => { if (!selectedKeys.includes(pk)) { params.delete(pk); changed = true; } });
    if (changed) navigate({ search: params.toString() }, { replace: true });
  }, [selected, p, navigate, location.search]);

  useEffect(() => {
    if (!p) return;
    if (!Array.isArray(p.variants) || !p.variants.length) { setActiveVariant(null); return; }
    const v = p.variants.find(v => {
      if (v.isActive === false) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
      return variantAttrs.every(k => {
        const lk = k.toLowerCase().trim();
        const val = selected[lk];
        if (!val) return true;
        return String(vAttrs[lk] || '').toLowerCase() === String(val || '').toLowerCase();
      });
    }) || null;
    if (!v && Object.keys(selected).length > 0) {
      let currentMatch = null;
      for (let i = variantAttrs.length; i > 0; i--) {
        const subAttrs = variantAttrs.slice(0, i);
        const partialMatch = p.variants.find(vx => {
          if (vx.isActive === false) return false;
          const vxAttrs = normalizeAttrs(vx.attributes, vx.sku, p.attributes);
          return subAttrs.every(k => {
            const lk = k.toLowerCase().trim();
            return String(vxAttrs[lk] || '').toLowerCase() === String(selected[lk] || '').toLowerCase();
          });
        });
        if (partialMatch) { currentMatch = partialMatch; break; }
      }
      if (currentMatch) { setSelected(normalizeAttrs(currentMatch.attributes, currentMatch.sku)); return; }
    }
    setActiveVariant(v);
    if (v) setActiveImg(0);
  }, [selected, p, variantAttrs]);

  useEffect(() => {
    if (!p) return;
    setSEO(p.name + ' | SmartOdisha', 'Buy ' + p.name + ' at best prices with fast delivery across Odisha.');
    const cleanup = injectJsonLd({
      '@context': 'https://schema.org/', '@type': 'Product', name: p.name,
      brand: { '@type': 'Brand', name: p.brand?.name || p.brand || 'SmartOdisha' },
      image: (p.images || []).map(i => i.url), category: p.category?.name || p.category || 'General',
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: String(p.price || 0), availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.origin + '/products/' + (p.slug || p._id) },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: String(p.ratingAvg || 0), reviewCount: String(p.ratingCount || 0) }
    });
    return cleanup;
  }, [p]);

  const variantOpts = (key) => {
    const set = new Set();
    const lowKey = key.toLowerCase().trim();
    if (lowKey === 'option' && Array.isArray(p?.variants)) {
      p.variants.forEach(v => { if (v.isActive !== false) set.add(v.sku || v._id); });
      return sortVariantValues(lowKey, Array.from(set));
    }
    const attrEntry = (p?.attributes || []).find(a => a.split(':')[0]?.toLowerCase().trim() === lowKey);
    if (attrEntry) { const vals = attrEntry.split(':')[1]?.split(',').filter(Boolean) || []; vals.forEach(v => set.add(v.trim())); }
    if (p?.variants?.length) {
      p.variants.forEach(v => {
        if (v.isActive === false) return;
        const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
        Object.entries(vAttrs).forEach(([vk, vv]) => { if (vk.toLowerCase().trim() === lowKey && vv) set.add(vv.trim()); });
      });
    }
    return sortVariantValues(lowKey, Array.from(set));
  };

  const isOptEnabled = (key, val) => {
    if (!p?.variants?.length) return true;
    const lowKey = key.toLowerCase().trim();
    if (lowKey === 'option') return p.variants.some(v => v.isActive !== false && v.stock > 0 && (v.sku === val || v._id === val));
    const otherSelections = { ...selected };
    delete otherSelections[lowKey];
    return p.variants.some(v => {
      if (v.isActive === false || v.stock <= 0) return false;
      const vAttrs = normalizeAttrs(v.attributes, v.sku, p.attributes);
      let matchVal = false;
      Object.entries(vAttrs).forEach(([vk, vv]) => {
        if (vk.toLowerCase().trim() === lowKey && String(vv || '').toLowerCase().trim() === String(val || '').toLowerCase().trim()) matchVal = true;
      });
      if (matchVal) {
        return Object.entries(otherSelections).every(([ok, ov]) => {
          if (!ov) return true;
          let matchOther = false;
          Object.entries(vAttrs).forEach(([vk, vv]) => {
            if (vk.toLowerCase().trim() === ok.toLowerCase().trim() && String(vv || '').toLowerCase().trim() === String(ov || '').toLowerCase().trim()) matchOther = true;
          });
          return matchOther;
        });
      }
      return false;
    });
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    if (variantAttrs.length > 0 && !matchedVariant) { notify('Please select all options', 'error'); return; }
    if (matchedVariant && matchedVariant.stock <= 0) { notify('This variant is out of stock', 'error'); return; }
    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined);
    if (ok) {
      await refreshCart();
      try {
        const { data } = await api.get('/api/recommendations/frequently-bought/' + p._id);
        const filtered = (data || []).filter(item => (item._id || item.id) !== p._id);
        setRecItems(filtered);
        if (filtered.length > 0) setRecOpen(true);
      } catch { }
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    if (variantAttrs.length > 0 && !matchedVariant) { notify('Please select all options', 'error'); return; }
    if (matchedVariant && matchedVariant.stock <= 0) { notify('This variant is out of stock', 'error'); return; }
    const ok = await addToCart({ ...p, minOrderQty: 1 }, matchedVariant || undefined);
    if (ok) { await refreshCart(); navigate('/order'); }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.origin + '/products/' + (p.slug || p._id);
      if (navigator.share) await navigator.share({ title: p.name, text: 'Check out ' + p.name + ' on SmartOdisha', url: shareUrl });
      else { await navigator.clipboard.writeText(shareUrl); notify('Link copied!', 'success'); }
    } catch { }
  };

  if (loading) return (
    <div className="pd-loading">
      <LoadingSpinner text="Loading product..." />
    </div>
  );

  if (error) return (
    <div className="pd-error">
      <div className="pd-error-card">
        <div className="pd-error-emoji">😔</div>
        <h2 className="pd-error-h">Not Found</h2>
        <p className="pd-error-p">{error}</p>
        <Link to="/products" className="pd-error-btn">← Back to Products</Link>
      </div>
    </div>
  );

  if (!p) return null;

  const displayPrice = Math.round(currentPrice || minPrice || 0);
  const displayMrpRounded = Math.round(currentMrp || displayMrp || 0);
  const stockClass = !isAvailable ? 'out' : (stockSt.text === 'Limited Stock' ? 'low' : 'in');
  const stockLabel = !isAvailable ? 'Out of Stock' : (stockSt.text === 'Limited Stock' ? 'Limited Stock — Order Soon' : 'In Stock');

  const defaultTab = hasHighlights ? 'highlights' : hasDescription ? 'description' : 'specs';

  return (
    <div className="pd">
      <style>{STYLES}</style>

      {/* ── Mobile Topbar ── */}
      <div className="pd-nav">
        <button className="pd-nav-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="pd-nav-title">{p.name}</span>
        <div className="pd-nav-actions">
          <button className="pd-nav-btn" onClick={handleShare} title="Share">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
          </button>
          <button
            className={`pd-nav-btn ${isInWishlist(p._id || p.id) ? 'active' : ''}`}
            onClick={() => isInWishlist(p._id || p.id) ? removeFromWishlist(p._id || p.id) : addToWishlist({ ...p, id: p._id || p.id })}
          >
            {isInWishlist(p._id || p.id)
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            }
          </button>
        </div>
      </div>

      {/* ── Desktop Breadcrumb ── */}
      <nav className="pd-bc">
        <Link to="/">Home</Link>
        <span className="pd-bc-sep">›</span>
        <Link to="/products">Products</Link>
        {p.category && (
          <>
            <span className="pd-bc-sep">›</span>
            <Link to={`/products?category=${p.category._id || p.category}`}>{p.category.name || p.category}</Link>
          </>
        )}
        <span className="pd-bc-sep">›</span>
        <span style={{ color: 'var(--ink2)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
      </nav>

      {/* ── Main Grid ── */}
      <div className="pd-main">

        {/* ── LEFT: Gallery ── */}
        <div className="pd-left-col">
          <div className="pd-gallery">
            <div
              className="pd-stage"
              onTouchStart={onMainImgTouchStart}
              onTouchEnd={onMainImgTouchEnd}
              onTouchCancel={onMainImgTouchCancel}
              onClick={onMainImgClick}
            >
              {discount > 0 && <div className="pd-badge-off">{discount}% OFF</div>}



              {imgLoading && imgs[activeImg] && <div className="pd-img-skeleton" />}
              {imgs[activeImg]
                ? <img
                    src={getImageUrl(imgs[activeImg], 800)}
                    alt={p.name}
                    className="pd-stage-img"
                    onLoad={() => setImgLoading(false)}
                    onError={() => setImgLoading(false)}
                    style={{ display: imgLoading ? 'none' : 'block' }}
                  />
                : <div className="pd-stage-no-img">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
                  </div>
              }
            </div>

            {imgs.length > 1 && (
              <div className="pd-dots">
                {imgs.map((_, i) => (
                  <button key={i} className={`pd-dot ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)} />
                ))}
              </div>
            )}

            {imgs.length > 1 && (
              <div className="pd-thumbs">
                {imgs.map((img, i) => (
                  <button key={i} className={`pd-thumb ${i === activeImg ? 'on' : ''}`} onClick={() => setActiveImg(i)}>
                    <img src={getImageUrl(img, 200)} alt={`${p.name} ${i + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="pd-right-col">

          {/* ─ Product Info Card ─ */}
          <div className="pd-card">
            <div className="pd-card-body">
              {p.brand && <div className="pd-brand-strip">{p.brand.name || p.brand}</div>}
              <h1 className="pd-title">{p.name}</h1>

              <div className="pd-meta">
                {(p.ratingAvg || p.ratingCount) ? (
                  <div className="pd-rating">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    {Number(p.ratingAvg || 4.3).toFixed(1)}
                  </div>
                ) : null}
                {p.ratingCount ? <span className="pd-rating-ct">{p.ratingCount} ratings</span> : null}
                <span className="pd-assured">✓ Assured</span>
              </div>

              <div className="pd-price-block">
                <div className="pd-price-lbl">Special Price</div>
                <div className="pd-price-row">
                  <span className="pd-price">₹{displayPrice.toLocaleString('en-IN')}</span>
                  {displayMrpRounded > displayPrice && (
                    <>
                      <span className="pd-price-mrp">₹{displayMrpRounded.toLocaleString('en-IN')}</span>
                      <span className="pd-save">{discount}% off</span>
                    </>
                  )}
                </div>
                <div className="pd-tax">{p.gst > 0 ? `Inclusive of ${p.gst}% GST` : 'Inclusive of all taxes'}</div>
              </div>

              <div className={`pd-stock ${stockClass}`}>
                <span className="pd-stock-dot" />
                {stockLabel}
              </div>
            </div>
          </div>

          {/* ─ Seller Card ─ */}
          {p.store && (
            <div className="pd-card">
              <div className="pd-seller-inner">
                <div className="pd-seller-av">
                  {p.store.image
                    ? <img src={getImageUrl(p.store.image, 100)} alt={p.store.name} />
                    : p.store.sellerAvatar
                    ? <img src={getImageUrl(p.store.sellerAvatar, 100)} alt={p.store.name} />
                    : '🏪'
                  }
                </div>
                <div className="pd-seller-info">
                  <div className="pd-seller-lbl">Sold by</div>
                  <div className="pd-seller-name">{p.store.name}</div>
                </div>
                <span className="pd-verified">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Verified
                </span>
              </div>
            </div>
          )}

          {/* ─ Variants Card ─ */}
          {variantAttrs.length > 0 && (
            <div className="pd-card">
              <div className="pd-var-section">
                <div className="pd-dlabel">Select Options</div>
                <div className="pd-var-row">
                  {variantAttrs.map((attr, attrIdx) => {
                    const lowAttr = attr.toLowerCase().trim();
                    const opts = variantOpts(attr);
                    const isColor = ['color', 'colour', 'finish', 'shade'].includes(lowAttr);
                    const selectedVal = selected[lowAttr];
                    return (
                      <div key={attrIdx}>
                        <div className="pd-var-lbl">
                          {attr}{selectedVal && <span>: {selectedVal}</span>}
                        </div>
                        <div className="pd-chips">
                          {opts.map((optVal, optIdx) => {
                            const enabled = isOptEnabled(attr, optVal);
                            const isOn = selected[lowAttr]?.toLowerCase() === String(optVal).toLowerCase();
                            return (
                              <button
                                key={optIdx}
                                className={`pd-chip${isOn ? ' on' : ''}${!enabled ? ' disabled' : ''}`}
                                onClick={() => enabled && setSelected(s => ({ ...s, [lowAttr]: String(optVal) }))}
                                disabled={!enabled}
                              >
                                {isColor ? (
                                  <span className="pd-chip-col">
                                    <span className="pd-col-dot" style={{ backgroundColor: optVal.toLowerCase() }} />
                                    {optVal}
                                  </span>
                                ) : optVal}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─ Delivery Card ─ */}
          <div className="pd-card">
            <div className="pd-del-body">
              <div className="pd-dlabel">Delivery</div>

              {user?.savedAddresses?.length > 0 ? (
                <div className="pd-addr-card">
                  <div className="pd-addr-top">
                    <span className="pd-addr-lbl2">Deliver to</span>
                    <button
                      className="pd-addr-change"
                      onClick={() => {
                        if (!selectedAddress) return;
                        const idx = user.savedAddresses.findIndex(a => a._id === selectedAddress._id);
                        const next = user.savedAddresses[(idx + 1) % user.savedAddresses.length];
                        setSelectedAddress(next);
                        if (next?.pincode) { setPincode(next.pincode); checkDeliveryImpl(next.pincode); }
                      }}
                    >
                      Change
                    </button>
                  </div>
                  <div className="pd-addr-val">
                    {selectedAddress?.fullName} · {selectedAddress?.city} — {selectedAddress?.pincode}
                  </div>
                </div>
              ) : (
                <form className="pd-pin-row" onSubmit={checkDelivery}>
                  <input
                    type="text"
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit pincode"
                    className="pd-pin-input"
                  />
                  <button type="submit" className="pd-pin-btn" disabled={checkingDelivery || pincode.length !== 6}>
                    {checkingDelivery ? '...' : 'Check'}
                  </button>
                </form>
              )}

              {deliveryInfo && (
                <div className={`pd-del-result ${deliveryInfo.serviceable ? 'ok' : 'fail'}`}>
                  {deliveryInfo.serviceable ? (
                    <div className="pd-del-eta">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                      Delivery by {deliveryInfo.etaStart?.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} – {deliveryInfo.etaEnd?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  ) : (
                    <div style={{ fontWeight: 700 }}>✗ {deliveryInfo.message || 'Not deliverable to this pincode'}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ─ Highlights / Description / Specs ─ */}
          {(hasHighlights || hasDescription || hasSpecifications) && (
            <div className="pd-card">
              <div className="pd-tabs-wrap">
                <div className="pd-tabs">
                  {hasHighlights && <button className={`pd-tab${activeTab === 'highlights' ? ' on' : ''}`} onClick={() => setActiveTab('highlights')}>Highlights</button>}
                  {hasDescription && <button className={`pd-tab${activeTab === 'description' ? ' on' : ''}`} onClick={() => setActiveTab('description')}>Description</button>}
                  {hasSpecifications && <button className={`pd-tab${activeTab === 'specs' ? ' on' : ''}`} onClick={() => setActiveTab('specs')}>Specs</button>}
                </div>
              </div>

              <div className="pd-tab-body">
                {activeTab === 'highlights' && hasHighlights && (
                  <ul className="pd-highlights">
                    {p.highlights.map((h, i) => (
                      <li key={i} className="pd-hi">
                        <svg className="pd-hi-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === 'description' && hasDescription && (
                  <div>
                    <p
                      className="pd-desc"
                      style={descriptionExpanded ? {} : { display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {p.description}
                    </p>
                    {p.description.length > 280 && (
                      <button className="pd-readmore" onClick={() => setDescriptionExpanded(!descriptionExpanded)}>
                        {descriptionExpanded ? '▲ Less' : '▼ Read More'}
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'specs' && hasSpecifications && (
                  <table className="pd-specs">
                    <tbody>
                      {p.specifications.map((spec, i) => {
                        if (typeof spec === 'object' && spec !== null) {
                          return (
                            <tr key={i}>
                              <td className="sk">{spec.key || spec.label}</td>
                              <td className="sv">{spec.value || spec.val}</td>
                            </tr>
                          );
                        }
                        if (typeof spec === 'string') {
                          const parts = spec.split(':').map(s => s.trim());
                          if (parts.length === 2) return (
                            <tr key={i}>
                              <td className="sk">{parts[0]}</td>
                              <td className="sv">{parts[1]}</td>
                            </tr>
                          );
                        }
                        return null;
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ─ Desktop CTA ─ */}
          <div className="pd-cta pd-desktop-cta">
            <button className="pd-btn-cart" onClick={handleAddToCart} disabled={!canAddToCart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              Add to Cart
            </button>
            <button className="pd-btn-buy" onClick={handleBuyNow} disabled={!canAddToCart}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
              Buy Now
            </button>
          </div>

        </div>
      </div>

      {/* ── Recommendations ── */}
      {similarProducts.length > 0 && (
        <div className="pd-recs-wrap">
          <div className="pd-recs-hd">
            <h3 className="pd-recs-title">You May Also Like</h3>
            <div className="pd-recs-line" />
          </div>
          <div className="pd-recs-grid">
            {similarProducts.map((product, i) => (
              <ProductCard key={i} p={product} authed={isAuthenticated} />
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && imgs[activeImg] && (
        <div className="pd-lb" onClick={() => setLightbox(false)}>
          <button className="pd-lb-close" onClick={() => setLightbox(false)}>×</button>
          <img src={getImageUrl(imgs[activeImg], 1200)} alt={p.name} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* ── Mobile Sticky CTA ── */}
      <div className="pd-sticky-cta">
        <button className="pd-mob-cart" onClick={handleAddToCart} disabled={!canAddToCart}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          Add to Cart
        </button>
        <button className="pd-mob-buy" onClick={handleBuyNow} disabled={!canAddToCart}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10"/></svg>
          Buy Now
        </button>
      </div>

      <RecommendationModal isOpen={recOpen} onClose={() => setRecOpen(false)} products={recItems} onAddToCart={handleAddToCart} />
    </div>
  );
}