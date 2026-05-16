import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { useCart } from '../../lib/CartContext'
import api from '../../lib/api'

export default function ManualPayment() {
  const nav        = useNavigate()
  const { notify } = useToast()
  const { clearCart } = useCart()
  const loc        = useLocation()

  const items         = Array.isArray(loc.state?.items) ? loc.state.items : []
  const amountDefault = Number(loc.state?.amount || 0)
  const cod20         = !!loc.state?.cod20

  const upiId   = import.meta.env.VITE_UPI_ID   || 'payments@click2kart'
  const upiName = import.meta.env.VITE_UPI_NAME  || 'Click2Kart'
  const qr      = import.meta.env.VITE_UPI_QR    || ''

  const [utr,     setUtr]     = useState('')
  const [note,    setNote]    = useState('')
  const [copied,  setCopied]  = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const totalText = useMemo(() => `₹${Number(amountDefault).toLocaleString('en-IN')}`, [amountDefault])

  const copy = async () => {
    try { await navigator.clipboard.writeText(upiId); setCopied(true); setTimeout(()=>setCopied(false), 2000); notify('UPI ID copied!','success') } catch {}
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!items.length) { nav('/order'); return }
    if (!utr || utr.trim().length < 6) { notify('Enter a valid UTR / Transaction ID','error'); return }
    setSubmitting(true)
    try {
      await api.post('/api/orders/manual-submit', {
        items,
        amountPaid: amountDefault,
        utr: utr.trim(),
        note: note.trim(),
        codAdvance20: cod20,
        couponCode: loc.state?.couponCode || ''
      })
      notify('Payment details submitted. Awaiting verification.', 'success')
      clearCart()
      nav('/orders')
    } catch { notify('Failed to submit payment details','error') }
    finally { setSubmitting(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        .mp-root{
          font-family:'DM Sans',system-ui,sans-serif;
          background:#f5f3ff; min-height:100vh; color:#1e1b2e;
          position:relative; overflow-x:hidden;
          display:flex; align-items:flex-start; justify-content:center;
          padding:36px 16px 60px;
          padding-bottom:calc(60px + env(safe-area-inset-bottom,0px));
        }
        .mp-root::before{
          content:''; position:fixed; inset:0; pointer-events:none; z-index:0;
          background-image:linear-gradient(rgba(139,92,246,.04)1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.04)1px,transparent 1px);
          background-size:60px 60px;
        }
        .mp-blob{position:fixed;top:-180px;left:50%;transform:translateX(-50%);width:700px;height:450px;border-radius:50%;pointer-events:none;z-index:0;background:radial-gradient(ellipse,rgba(139,92,246,.08),transparent 65%);}

        .mp-inner{width:100%;max-width:620px;position:relative;z-index:1;animation:mpUp .5s ease both;}

        /* ── CARD ── */
        .mp-card{
          background:white;
          border:1px solid rgba(139,92,246,.14);
          border-radius:24px; overflow:hidden;
          box-shadow:0 4px 32px rgba(139,92,246,.08);
          position:relative;
        }
        .mp-card::before{
          content:''; position:absolute; top:0; left:0; right:0; height:3px;
          background:linear-gradient(90deg,transparent 5%,#7c3aed 50%,transparent 95%);
        }

        /* card header */
        .mp-card-head{
          padding:24px 28px 20px;
          border-bottom:1px solid rgba(139,92,246,.08);
        }
        @media(max-width:480px){.mp-card-head{padding:20px 20px 16px;}}

        .mp-secure-pill{
          display:inline-flex; align-items:center; gap:6px;
          padding:4px 12px; border-radius:100px;
          background:rgba(5,150,105,.08); border:1px solid rgba(5,150,105,.2);
          color:#059669; font-size:9px; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
          margin-bottom:14px;
        }
        .mp-head-title{
          font-family:'Bebas Neue',sans-serif;
          font-size:clamp(28px,5vw,38px);
          color:#1e1b2e; letter-spacing:.02em; line-height:1; margin-bottom:6px;
        }
        .mp-head-title span{color:#7c3aed;}
        .mp-head-sub{font-size:13px;color:#6b7280;font-weight:400;}

        /* amount banner */
        .mp-amount-banner{
          display:flex; align-items:center; justify-content:space-between;
          background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(139,92,246,.03));
          border:1px solid rgba(139,92,246,.15);
          border-radius:14px; padding:16px 20px;
          margin-top:16px;
        }
        .mp-amount-left{}
        .mp-amount-label{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px;}
        .mp-amount-val{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#7c3aed;letter-spacing:.03em;line-height:1;}
        .mp-amount-tag{
          display:inline-flex;align-items:center;gap:5px;
          padding:5px 12px;border-radius:8px;
          background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.18);
          font-size:10px;font-weight:700;color:#7c3aed;letter-spacing:.08em;text-transform:uppercase;
        }
        .mp-amount-lock{color:#7c3aed;font-size:14px;}
        .mp-cod-note{font-size:11px;color:#6b7280;font-weight:500;margin-top:4px;}

        /* card body */
        .mp-card-body{padding:28px;}
        @media(max-width:480px){.mp-card-body{padding:20px;}}

        /* ── STEPS ── */
        .mp-steps{display:flex;flex-direction:column;gap:0;}

        /* step row */
        .mp-step{display:flex;gap:16px;position:relative;}
        .mp-step:not(:last-child){padding-bottom:0;}

        /* left timeline */
        .mp-step-left{display:flex;flex-direction:column;align-items:center;flex-shrink:0;}
        .mp-step-circle{
          width:36px;height:36px;border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:.05em;
          flex-shrink:0;position:relative;z-index:1;
        }
        .mp-step-circle.s1{background:#7c3aed;color:white;box-shadow:0 4px 14px rgba(124,58,237,.3);}
        .mp-step-circle.s2{background:#f5f3ff;border:2px solid rgba(139,92,246,.2);color:#9ca3af;}
        .mp-step-circle.s2.active{background:#7c3aed;color:white;box-shadow:0 4px 14px rgba(124,58,237,.3);}
        .mp-step-line{width:2px;flex:1;min-height:24px;background:linear-gradient(to bottom,rgba(139,92,246,.25),rgba(139,92,246,.06));margin:6px 0;}

        /* step content */
        .mp-step-body{flex:1;min-width:0;padding-bottom:28px;}
        .mp-step-body:last-child{padding-bottom:0;}
        .mp-step-tag{
          display:inline-flex;align-items:center;gap:6px;
          font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;
          color:#7c3aed;margin-bottom:10px;
        }
        .mp-step-tag-num{
          width:20px;height:20px;border-radius:6px;
          background:#7c3aed;color:white;
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:800;
        }
        .mp-step-h{font-family:'Bebas Neue',sans-serif;font-size:20px;color:#1e1b2e;letter-spacing:.03em;margin-bottom:14px;}

        /* UPI section */
        .mp-upi-box{
          background:#f9f7ff;border:1px solid rgba(139,92,246,.12);
          border-radius:16px;padding:20px;
          display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;
        }

        /* QR */
        .mp-qr{
          width:110px;height:110px;flex-shrink:0;
          border-radius:14px;overflow:hidden;
          border:2px solid rgba(139,92,246,.18);
          background:white;
          display:flex;align-items:center;justify-content:center;
        }
        .mp-qr img{width:100%;height:100%;object-fit:contain;}
        .mp-qr-ph{
          width:100%;height:100%;
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:6px;color:#c4b5fd;
        }
        .mp-qr-ph-text{font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;text-align:center;}

        .mp-upi-right{flex:1;min-width:160px;}
        .mp-upi-label{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#9ca3af;margin-bottom:8px;}

        .mp-upi-id-row{
          display:flex;align-items:center;gap:8px;
          background:white;border:1px solid rgba(139,92,246,.18);
          border-radius:10px;padding:10px 14px;margin-bottom:10px;
        }
        .mp-upi-id-val{font-size:14px;font-weight:700;color:#1e1b2e;flex:1;font-family:monospace;}
        .mp-copy-btn{
          display:inline-flex;align-items:center;gap:5px;
          padding:6px 12px;border-radius:8px;border:none;
          background: rgba(139,92,246,.1);color:#7c3aed;
          font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;flex-shrink:0;
        }
        .mp-copy-btn.done{background:rgba(5,150,105,.1);color:#059669;}
        .mp-copy-btn:hover{background:rgba(139,92,246,.18);}

        .mp-upi-hint{font-size:12px;color:#6b7280;font-weight:500;line-height:1.5;}
        .mp-upi-apps{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
        .mp-app-pill{
          font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
          padding:3px 10px;border-radius:100px;
          background:white;border:1px solid rgba(139,92,246,.15);color:#7c3aed;
        }

        /* divider */
        .mp-step-divider{height:1px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.12),transparent);margin:0 0 28px;}

        /* ── FORM FIELDS ── */
        .mp-field-grid{display:grid;grid-template-columns:1fr;gap:14px;margin-bottom:14px;}
        @media(min-width:460px){.mp-field-grid{grid-template-columns:1fr 1fr;}}

        .mp-field{display:flex;flex-direction:column;gap:6px;}
        .mp-field-label{
          display:flex;align-items:center;gap:6px;
          font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#6b7280;
        }
        .mp-field-label svg{color:#7c3aed;}
        .mp-field-label em{color:#7c3aed;font-style:normal;}

        .mp-input{
          width:100%;box-sizing:border-box;
          background:#f9f7ff;border:1.5px solid rgba(139,92,246,.18);
          border-radius:12px;padding:13px 16px;
          font-size:14px;font-weight:600;color:#1e1b2e;
          outline:none;font-family:'DM Sans',sans-serif;transition:all .2s;
        }
        .mp-input::placeholder{color:#c4b5fd;font-weight:400;}
        .mp-input:focus{border-color:rgba(124,58,237,.5);background:white;box-shadow:0 0 0 3px rgba(124,58,237,.08);}

        .mp-input-prefix-wrap{
          position:relative;
        }
        .mp-input-prefix{
          position:absolute;left:14px;top:50%;transform:translateY(-50%);
          font-size:15px;font-weight:700;color:#7c3aed;pointer-events:none;
        }
        .mp-input.has-prefix{padding-left:32px;}

        .mp-textarea{
          width:100%;box-sizing:border-box;
          background:#f9f7ff;border:1.5px solid rgba(139,92,246,.18);
          border-radius:12px;padding:13px 16px;
          font-size:14px;font-weight:600;color:#1e1b2e;
          outline:none;font-family:'DM Sans',sans-serif;transition:all .2s;
          resize:none;min-height:88px;
        }
        .mp-textarea::placeholder{color:#c4b5fd;font-weight:400;}
        .mp-textarea:focus{border-color:rgba(124,58,237,.5);background:white;box-shadow:0 0 0 3px rgba(124,58,237,.08);}

        /* amount display (read only) */
        .mp-amount-display{
          display:flex;align-items:center;gap:10px;
          background:#f9f7ff;border:1.5px solid rgba(139,92,246,.18);
          border-radius:12px;padding:12px 16px;
        }
        .mp-amount-display-val{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#7c3aed;letter-spacing:.03em;flex:1;}
        .mp-amount-lock-tag{
          display:inline-flex;align-items:center;gap:4px;
          font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
          color:#7c3aed;background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.15);
          padding:3px 9px;border-radius:100px;
        }

        /* submit */
        .mp-submit{
          width:100%;padding:15px;border-radius:13px;border:none;
          background:#7c3aed;color:white;
          font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .25s;
          display:flex;align-items:center;justify-content:center;gap:8px;
          box-shadow:0 6px 20px rgba(124,58,237,.28);
          margin-bottom:10px;
        }
        .mp-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(124,58,237,.4);}
        .mp-submit:active:not(:disabled){transform:scale(.97);}
        .mp-submit:disabled{opacity:.5;cursor:not-allowed;}

        .mp-back{
          width:100%;padding:13px;border-radius:13px;border:1px solid rgba(139,92,246,.2);
          background:white;color:#6b7280;
          font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;
          cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s;
        }
        .mp-back:hover{border-color:rgba(124,58,237,.35);color:#7c3aed;background:#f9f7ff;}

        /* spinner */
        .mp-spin{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:mpspin .7s linear infinite;}
        @keyframes mpspin{to{transform:rotate(360deg)}}

        .mp-secure-footer{display:flex;align-items:center;justify-content:center;gap:6px;font-size:11px;color:#9ca3af;margin-top:12px;font-weight:500;}

        @keyframes mpUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
      `}</style>

      <div className="mp-root">
        <div className="mp-blob"/>
        <div className="mp-inner">
          <div className="mp-card">

            {/* ── CARD HEADER ── */}
            <div className="mp-card-head">
              <div className="mp-secure-pill">
                <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Secure Transaction
              </div>
              <h1 className="mp-head-title">
                Pay via <span>UPI</span>
                {cod20 && <span style={{fontSize:'55%',color:'#6b7280',fontFamily:'DM Sans',fontWeight:700,letterSpacing:'.04em',display:'block',marginTop:2}}>20% COD Advance Payment</span>}
              </h1>
              <p className="mp-head-sub">
                {cod20 ? 'Pay 20% advance via UPI to confirm your COD order.' : 'Transfer the exact amount via UPI and submit your transaction details for verification.'}
              </p>

              {/* amount banner */}
              <div className="mp-amount-banner">
                <div>
                  <div className="mp-amount-label">{cod20 ? '20% Advance Amount' : 'Amount to Pay'}</div>
                  <div className="mp-amount-val">{totalText}</div>
                  {cod20 && <div className="mp-cod-note">Remaining 80% payable on delivery</div>}
                </div>
                <div className="mp-amount-tag">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  Fixed Amount
                </div>
              </div>
            </div>

            {/* ── CARD BODY ── */}
            <div className="mp-card-body">
              <div className="mp-steps">

                {/* ── STEP 1: Pay via UPI ── */}
                <div className="mp-step">
                  <div className="mp-step-left">
                    <div className="mp-step-circle s1">1</div>
                    <div className="mp-step-line"/>
                  </div>
                  <div className="mp-step-body">
                    <div className="mp-step-tag">
                      <div className="mp-step-tag-num">1</div>
                      Transfer Amount
                    </div>
                    <div className="mp-step-h">Pay via UPI / Bank Transfer</div>

                    <div className="mp-upi-box">
                      {/* QR */}
                      <div className="mp-qr">
                        {qr ? <img src={qr} alt="UPI QR Code"/> : (
                          <div className="mp-qr-ph">
                            <svg width="32" height="32" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{opacity:.3}}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>
                            </svg>
                            <div className="mp-qr-ph-text">QR Code<br/>Coming Soon</div>
                          </div>
                        )}
                      </div>

                      {/* UPI details */}
                      <div className="mp-upi-right">
                        <div className="mp-upi-label">UPI ID</div>
                        <div className="mp-upi-id-row">
                          <span className="mp-upi-id-val">{upiId}</span>
                          <button className={`mp-copy-btn${copied?' done':''}`} onClick={copy} type="button">
                            {copied ? (
                              <><svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Copied!</>
                            ) : (
                              <><svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg> Copy</>
                            )}
                          </button>
                        </div>
                        <div className="mp-upi-hint">
                          Scan the QR code or copy the UPI ID to pay from any UPI app.
                        </div>
                        <div className="mp-upi-apps">
                          {['GPay','PhonePe','Paytm','BHIM'].map(a=>(
                            <span key={a} className="mp-app-pill">{a}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── STEP 2: Submit Details ── */}
                <div className="mp-step">
                  <div className="mp-step-left">
                    <div className={`mp-step-circle s2${utr?'':''} active`}>2</div>
                  </div>
                  <div className="mp-step-body" style={{ paddingBottom:0 }}>
                    <div className="mp-step-tag">
                      <div className="mp-step-tag-num">2</div>
                      Submit Details
                    </div>
                    <div className="mp-step-h">Confirm Your Payment</div>

                    <form onSubmit={submit}>

                      <div className="mp-field-grid">
                        {/* Amount — read only */}
                        <div className="mp-field">
                          <label className="mp-field-label">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Amount Paid (₹)
                          </label>
                          <div className="mp-amount-display">
                            <div className="mp-amount-display-val">{totalText}</div>
                            <div className="mp-amount-lock-tag">
                              <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                              Locked
                            </div>
                          </div>
                        </div>

                        {/* UTR */}
                        <div className="mp-field">
                          <label className="mp-field-label">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Bank UTR / Ref No. <em>*</em>
                          </label>
                          <input
                            className="mp-input"
                            value={utr}
                            onChange={e=>setUtr(e.target.value)}
                            placeholder="12-digit UTR number"
                            required
                          />
                        </div>
                      </div>

                      {/* Note */}
                      <div className="mp-field" style={{ marginBottom:20 }}>
                        <label className="mp-field-label">
                          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          Note (Optional)
                        </label>
                        <textarea
                          className="mp-textarea"
                          value={note}
                          onChange={e=>setNote(e.target.value)}
                          placeholder="Any additional details…"
                        />
                      </div>

                      <button type="submit" className="mp-submit" disabled={submitting||!utr.trim()||utr.trim().length<6}>
                        {submitting ? (
                          <><div className="mp-spin"/> Submitting…</>
                        ) : (
                          <>
                            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Submit Payment Details
                          </>
                        )}
                      </button>

                      <button type="button" className="mp-back" onClick={()=>nav(-1)}>
                        ← Go Back
                      </button>

                      <div className="mp-secure-footer">
                        <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        Your payment details are reviewed within 2–4 hours · Click2Kart
                      </div>

                    </form>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}