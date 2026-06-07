import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from './ProductCard';

/**
 * Premium Recommendation Modal (Smart Pairing)
 * Optimized for Mobile (Bottom Sheet style) and Desktop (Centered Glass Card)
 */
export default function RecommendationModal({ open, items, onClose, onAddToCart }) {
  const navigate = useNavigate();
  if (!items || items.length === 0) return null;

  const authed = !!localStorage.getItem('token');

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center overflow-hidden">
          <style>{`
            /* ─── PRODUCT CARD (COPIED FROM CATALOGUE) ─── */
            .ct-card {
              background: white; border-radius: 20px; overflow: hidden;
              border: 1px solid rgba(124,58,237,.09);
              display: flex; flex-direction: column; cursor: pointer;
              transition: transform .3s cubic-bezier(.34,1.4,.64,1), box-shadow .3s, border-color .3s;
              position: relative;
              box-shadow: 0 2px 14px rgba(124,58,237,.05);
              animation: ctFadeUp .45s ease both;
              height: 100%;
            }
            .ct-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 14px 40px rgba(124,58,237,.14);
              border-color: rgba(124,58,237,.22);
            }
            .ct-card-img-z {
              position: relative; background: #f9f7ff;
              overflow: hidden; aspect-ratio: 1;
              display: flex; align-items: center; justify-content: center;
            }
            .ct-card-img {
              width: 100%; height: 100%; object-fit: contain; padding: 12px;
              transition: transform .5s cubic-bezier(.34,1.56,.64,1);
            }
            .ct-card:hover .ct-card-img { transform: scale(1.09); }
            .ct-card-img-ph {
              font-size: 32px; opacity: .18;
            }
            .ct-bulk {
              position: absolute; top: 6px; left: 6px; z-index: 3;
              display: inline-flex; align-items: center; gap: 4px;
              padding: 3px 8px; border-radius: 100px;
              font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase;
              color: white; background: linear-gradient(130deg, #7c3aed 0%, #5b21b6 60%, #4c1d95 100%);
              box-shadow: 0 4px 12px rgba(124,58,237,.4), 0 0 0 1px rgba(255,255,255,.15) inset;
            }
            .ct-disc {
              position: absolute; top: 6px; left: 6px; z-index: 3;
              padding: 3px 7px; border-radius: 6px;
              font-size: 8px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase;
              color: white; background: linear-gradient(135deg, #059669, #047857);
            }
            .ct-actions {
              position: absolute; top: 6px; right: 6px;
              display: flex; flex-direction: column; gap: 4px;
              opacity: 0; transform: translateX(5px); transition: all .2s;
            }
            .ct-card:hover .ct-actions { opacity: 1; transform: translateX(0); }
            .ct-act-btn {
              width: 28px; height: 28px; border-radius: 8px; border: none;
              background: rgba(255,255,255,.9); backdrop-filter: blur(6px);
              display: flex; align-items: center; justify-content: center;
              cursor: pointer; color: #9ca3af;
            }
            .ct-body { padding: 10px; flex: 1; display: flex; flex-direction: column; gap: 5px; }
            .ct-top-row { display: flex; align-items: center; justify-content: space-between; }
            .ct-cat-pill { font-size: 8px; font-weight: 700; color: #6b7280; background: #f5f3ff; padding: 2px 6px; border-radius: 100px; }
            .ct-verified { display: inline-flex; align-items: center; gap: 2px; font-size: 7px; font-weight: 700; color: #7c3aed; background: rgba(124,58,237,.07); padding: 2px 6px; border-radius: 100px; }
            .ct-pname {
              font-size: 11px; font-weight: 700; color: #1e1b2e; line-height: 1.3;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
              text-decoration: none;
            }
            .ct-price-area { margin-top: auto; display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; }
            .ct-price-authed { font-family: 'Bebas Neue', sans-serif; font-size: 16px; color: #7c3aed; letter-spacing: .02em; display: flex; align-items: center; gap: 4px; }
            .ct-price-off { font-family: 'DM Sans', sans-serif; font-size: 9px; font-weight: 800; color: #059669; }
            .ct-price-mrp { font-size: 9px; color: #9ca3af; text-decoration: line-through; }
            .ct-atc {
              width: 32px; height: 32px; border-radius: 10px; border: none;
              display: flex; align-items: center; justify-content: center;
              background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white;
            }
            .ct-tags { display: flex; flex-wrap: wrap; gap: 3px; }
            .ct-tag { font-size: 7px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
            @keyframes ctFadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
          {/* Backdrop with premium frosted blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" 
            onClick={onClose} 
          />
          
          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white/95 backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-[0_-20px_80px_-20px_rgba(0,0,0,0.3)] sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.4)] w-full max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] border-t sm:border border-white/40"
          >
            {/* Mobile Drag Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />

            {/* Header Section */}
            <div className="px-6 sm:px-10 pt-4 sm:pt-8 pb-4 relative shrink-0 text-center">
              <button 
                onClick={onClose} 
                className="absolute top-4 sm:top-6 right-6 sm:right-8 h-10 w-10 rounded-full bg-slate-100/80 flex items-center justify-center hover:bg-slate-200 transition-all duration-300 backdrop-blur-md group"
              >
                <svg className="w-5 h-5 text-slate-500 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 mb-3 sm:mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Smart Pairing</span>
              </div>
              
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1 sm:mb-2">
                Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Add-ons</span>
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm font-medium max-w-md mx-auto px-4">Partners often buy these items together. Boost your margins with these picks.</p>
            </div>
            
            {/* Items Section */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {items.map((item, idx) => (
                  <ProductCard
                    key={item._id || item.id}
                    p={item}
                    authed={authed}
                    addToCart={onAddToCart}
                    navigate={navigate}
                    index={idx}
                  />
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 sm:p-8 bg-slate-50/80 sm:bg-slate-50/50 backdrop-blur-md flex items-center justify-between gap-4 sm:gap-6 shrink-0 border-t border-slate-100">
              <button 
                onClick={onClose} 
                className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-slate-600 transition-colors"
              >
                Skip
              </button>
              <Link 
                to="/cart" 
                onClick={onClose}
                className="flex-1 sm:flex-none text-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-300"
              >
                View Cart →
              </Link>
            </div>
          </motion.div>

          <style dangerouslySetInnerHTML={{ __html: `
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
          `}} />
        </div>
      )}
    </AnimatePresence>
  );
}
