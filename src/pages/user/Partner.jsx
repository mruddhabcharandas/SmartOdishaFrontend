import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import PasswordInput from '../../components/PasswordInput'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { CONFIG } from '../../shared/lib/config.js'

const COLORS = ['#8b5cf6', '#7c3aed', '#a78bfa', '#6d28d9', '#c4b5fd', '#ddd6fe']

export default function Partner() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [useOtp, setUseOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('partnerData')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  useEffect(() => {
    const token = localStorage.getItem('partnerToken')
    if (token) {
      if (window.location.pathname === '/partner') {
        navigate('/partner/dashboard')
      }
      if (!data) {
        setLoading(true)
        api.get('/api/public/partner/me')
          .then(({ data }) => {
            setData(data)
            localStorage.setItem('partnerData', JSON.stringify(data))
          })
          .catch(() => {
            localStorage.removeItem('partnerToken')
            localStorage.removeItem('partnerData')
            setData(null)
            navigate('/partner')
          })
          .finally(() => setLoading(false))
      }
    }
  }, [data, navigate])

  const logout = () => {
    localStorage.removeItem('partnerToken')
    localStorage.removeItem('partnerData')
    setData(null)
    navigate('/partner')
  }

  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const sendOtp = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid business email address');
      return;
    }
    setLoading(true); setError(null)
    try {
      await api.post('/api/public/partner/send-otp', { email })
      setOtpSent(true)
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async (e) => {
    e.preventDefault()
    if (!validateEmail(email)) {
      setError('Please enter a valid business email address');
      return;
    }
    if (!password && !otp) return
    setLoading(true); setError(null); setData(null)
    try {
      const payload = useOtp ? { otp, email } : { password, email }
      const { data } = await api.post(`/api/public/partner/login`, payload)
      if (data.token) {
        localStorage.setItem('partnerToken', data.token)
        localStorage.setItem('partnerData', JSON.stringify(data))
      }
      setData(data)
      navigate('/partner/dashboard')
    } catch (err) {
      setError(err?.response?.data?.error || 'Authentication failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700&display=swap');

        .pr-root {
          font-family: 'DM Sans', system-ui, sans-serif;
          background: #f5f3ff;
          min-height: 100vh;
          color: #1e1b2e;
          position: relative;
          overflow-x: hidden;
        }

        /* same grid pattern as Home hero */
        .pr-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        /* radial violet glow blobs — same as Home */
        .pr-blob {
          position: fixed; top: -200px; left: 50%; transform: translateX(-50%);
          width: 900px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.1), transparent 65%);
          pointer-events: none; z-index: 0;
        }
        .pr-blob2 {
          position: fixed; bottom: -200px; right: -150px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(109,40,217,0.07), transparent 65%);
          pointer-events: none; z-index: 0;
        }

        .pr-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 24px 80px;
          position: relative; z-index: 1;
        }

        /* ── HEADER ── */
        .pr-header {
          display: flex; flex-direction: column; gap: 32px;
          margin-bottom: 48px;
          animation: prFadeUp 0.7s ease both;
        }
        @media(min-width:900px) {
          .pr-header { flex-direction: row; align-items: flex-start; justify-content: space-between; }
        }

        .pr-logo-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }

        .pr-logo {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 900; color: white;
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          border: 1px solid rgba(167,139,250,0.4);
          overflow: hidden; position: relative;
        }

        /* same eyebrow pill as Home */
        .pr-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 18px; border-radius: 100px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.25);
          color: #7c3aed;
          font-size: 9px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
        }
        .pr-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #7c3aed; box-shadow: 0 0 6px rgba(124,58,237,0.5);
          animation: prPulse 2s ease infinite;
        }
        @keyframes prPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

        /* Bebas Neue — exact same as Home h1 */
        .pr-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(40px, 6vw, 64px);
          color: #1e1b2e;
          letter-spacing: 0.02em; line-height: 0.95;
          margin: 12px 0 10px;
        }
        .pr-title span { color: #7c3aed; }

        .pr-subtitle {
          font-size: 14px; color: #6b7280; font-weight: 300;
          max-width: 380px; line-height: 1.65;
        }

        /* ── FORM ── */
        .pr-form {
          display: flex; flex-direction: column; gap: 10px;
          background: white;
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 24px; padding: 20px;
          box-shadow: 0 8px 40px rgba(139,92,246,0.08);
          width: 100%; max-width: 420px;
          align-self: flex-start;
        }

        .pr-input {
          width: 100%; box-sizing: border-box;
          background: #f5f3ff;
          border: 1px solid rgba(139,92,246,0.2);
          border-radius: 14px; padding: 13px 16px;
          font-size: 13px; font-weight: 600; color: #1e1b2e;
          outline: none; font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .pr-input::placeholder { color: #9ca3af; }
        .pr-input:focus {
          border-color: rgba(124,58,237,0.5); background: white;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.08);
        }

        /* same as Home btn-primary */
        .pr-btn {
          width: 100%;
          display: inline-flex; align-items: center; justify-content: center; gap: 12px;
          background: linear-gradient(135deg, #7c3aed, #6366f1); color: white;
          border: none; border-radius: 16px; padding: 16px 32px;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.15em; text-transform: uppercase;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 8px 24px rgba(124,58,237,0.3);
          position: relative; overflow: hidden;
        }
        .pr-btn::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transform: translateX(-100%); transition: transform 0.6s;
        }
        .pr-btn:hover:not(:disabled) { 
          transform: translateY(-3px) scale(1.02); 
          box-shadow: 0 16px 48px rgba(124,58,237,0.45); 
        }
        .pr-btn:hover:not(:disabled)::after { transform: translateX(100%); }
        .pr-btn:active:not(:disabled) { transform: translateY(-1px) scale(0.97); }
        .pr-btn:disabled { background: #f3f4f6; color: #d1d5db; box-shadow: none; cursor: not-allowed; }

        /* ── ERROR ── */
        .pr-error {
          display: flex; align-items: center; gap: 12px;
          background: #fef2f2; border: 1px solid #fecaca;
          color: #dc2626; font-size: 13px; font-weight: 600;
          padding: 14px 20px; border-radius: 14px; margin-bottom: 20px;
          animation: prFadeUp 0.4s ease;
        }

        /* ── ONBOARDING — mirrors Home CTA section ── */
        .pr-onboard {
          background: white;
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 32px; padding: 64px 40px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 50px rgba(139,92,246,0.07);
          animation: prFadeUp 0.7s 0.1s ease both;
        }
        /* same top violet stripe as Home CTA */
        .pr-onboard::after {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent 10%, #7c3aed 50%, transparent 90%);
          border-radius: 32px 32px 0 0;
        }
        .pr-onboard-glow {
          position: absolute; top: -80px; left: 50%; transform: translateX(-50%);
          width: 500px; height: 300px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.07), transparent 70%);
          pointer-events: none;
        }
        .pr-onboard-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: clamp(36px, 6vw, 60px);
          line-height: 1; letter-spacing: 0.02em;
          color: #1e1b2e; margin: 16px 0;
        }
        .pr-onboard-title em { color: #7c3aed; font-style: normal; }
        .pr-onboard-sub {
          font-size: 16px; color: #6b7280; font-weight: 300;
          max-width: 460px; margin: 0 auto 40px; line-height: 1.7;
        }
        .pr-contact-card {
          display: inline-flex; align-items: center; gap: 16px;
          background: #f5f3ff; border: 1px solid rgba(139,92,246,0.2);
          padding: 18px 32px; border-radius: 16px; transition: all 0.25s;
        }
        .pr-contact-card:hover {
          background: white; border-color: rgba(124,58,237,0.4);
          box-shadow: 0 8px 24px rgba(124,58,237,0.1); transform: translateY(-2px);
        }
        .pr-contact-icon {
          width: 46px; height: 46px; border-radius: 13px;
          background: linear-gradient(135deg, #7c3aed, #a855f7);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 6px 18px rgba(124,58,237,0.3); flex-shrink: 0;
        }
        .pr-contact-label { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #7c3aed; }
        .pr-contact-value { font-size: 16px; font-weight: 700; color: #1e1b2e; margin-top: 3px; }

        /* ── EMPTY ── */
        .pr-empty {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 60px 24px;
          animation: prFadeUp 0.7s 0.15s ease both;
        }
        .pr-empty-icon {
          width: 80px; height: 80px; border-radius: 24px;
          background: #f5f3ff; border: 1px solid rgba(139,92,246,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; margin-bottom: 20px;
          box-shadow: inset 0 2px 8px rgba(139,92,246,0.06);
        }
        .pr-empty h3 { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #1e1b2e; letter-spacing: 0.05em; }
        .pr-empty p { font-size: 13px; color: #9ca3af; margin-top: 6px; max-width: 260px; }

        /* ── PROFILE CARD — same white card style as Home trust badges ── */
        .pr-profile {
          background: white;
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 28px; padding: 36px 40px;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 40px rgba(139,92,246,0.07);
          animation: prFadeUp 0.6s ease both;
        }
        .pr-profile::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent 10%, #7c3aed 50%, transparent 90%);
        }
        .pr-profile-glow {
          position: absolute; top: -60px; right: -60px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(ellipse, rgba(139,92,246,0.06), transparent 70%);
          pointer-events: none;
        }

        .pr-avatar {
          width: 64px; height: 64px; border-radius: 18px;
          background: linear-gradient(135deg, #6d28d9, #a855f7);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 26px; color: white; letter-spacing: 0.05em;
          box-shadow: 0 8px 24px rgba(109,40,217,0.3);
          border: 1px solid rgba(167,139,250,0.3); margin-bottom: 14px;
        }

        .pr-partner-name {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 32px; color: #1e1b2e; letter-spacing: 0.02em; line-height: 1;
        }
        .pr-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; }
        .pr-meta-chip { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #6b7280; font-weight: 500; }

        .pr-code-pill {
          display: inline-flex; align-items: center; gap: 8px;
          background: #f5f3ff; border: 1px solid rgba(139,92,246,0.25);
          padding: 10px 20px; border-radius: 12px;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 22px; color: #7c3aed; letter-spacing: 0.08em;
        }
        .pr-rate {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 10px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.15em; color: #059669; margin-top: 8px;
        }
        .pr-rate-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; box-shadow: 0 0 6px #10b981; }

        /* ── STATS — same hover card style ── */
        .pr-stats {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 12px; margin-top: 28px;
        }
        @media(min-width:640px) { .pr-stats { grid-template-columns: repeat(4, 1fr); } }

        .pr-stat {
          background: #f9f7ff; border: 1px solid rgba(139,92,246,0.1);
          border-radius: 18px; padding: 20px 18px;
          transition: all 0.3s; position: relative; overflow: hidden;
        }
        .pr-stat::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .pr-stat:hover { background: white; border-color: rgba(124,58,237,0.25); box-shadow: 0 6px 24px rgba(124,58,237,0.08); transform: translateY(-2px); }
        .pr-stat:hover::before { opacity: 1; }
        .pr-stat-label { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #9ca3af; margin-bottom: 8px; }
        .pr-stat-val { font-family: 'Bebas Neue', sans-serif; font-size: 26px; color: #1e1b2e; letter-spacing: 0.02em; line-height: 1; }
        .pr-stat.green .pr-stat-label { color: #059669; }
        .pr-stat.green .pr-stat-val { color: #059669; }
        .pr-stat.blue .pr-stat-label { color: #2563eb; }
        .pr-stat.blue .pr-stat-val { color: #2563eb; }

        /* ── CHARTS ROW ── */
        .pr-charts {
          display: grid; grid-template-columns: 1fr;
          gap: 16px; margin-top: 16px;
          animation: prFadeUp 0.6s 0.15s ease both;
        }
        @media(min-width:768px) { .pr-charts { grid-template-columns: 1fr 1fr; } }

        /* same white card as Home trust badges */
        .pr-card {
          background: white;
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 24px; padding: 30px;
          box-shadow: 0 4px 24px rgba(139,92,246,0.05);
          position: relative; overflow: hidden;
          transition: all 0.3s;
        }
        .pr-card:hover { box-shadow: 0 8px 40px rgba(139,92,246,0.1); border-color: rgba(124,58,237,0.25); }
        .pr-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent);
        }
        .pr-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .pr-card-title { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #9ca3af; }
        .pr-card-dot { width: 6px; height: 6px; border-radius: 50%; background: #7c3aed; box-shadow: 0 0 6px rgba(124,58,237,0.4); animation: prPulse 2s ease infinite; }
        .pr-count-tag { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #7c3aed; background: #f5f3ff; border: 1px solid rgba(139,92,246,0.2); padding: 3px 10px; border-radius: 8px; }

        .pr-empty-chart {
          height: 260px; display: flex; align-items: center; justify-content: center;
          background: #f9f7ff; border-radius: 14px;
          border: 1px dashed rgba(139,92,246,0.2);
          font-size: 13px; color: #9ca3af; font-weight: 500;
        }

        /* ── PAYOUTS ── */
        .pr-payout {
          background: #f9f7ff; border: 1px solid rgba(139,92,246,0.08);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 10px; transition: all 0.25s;
        }
        .pr-payout:hover { background: white; border-color: rgba(124,58,237,0.2); box-shadow: 0 4px 16px rgba(124,58,237,0.06); }
        .pr-payout-amount { font-family: 'Bebas Neue', sans-serif; font-size: 22px; color: #7c3aed; letter-spacing: 0.03em; }
        .pr-payout-date { font-size: 10px; color: #9ca3af; font-weight: 600; }
        .pr-method { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; color: #7c3aed; background: #f5f3ff; border: 1px solid rgba(139,92,246,0.2); padding: 3px 10px; border-radius: 6px; }
        .pr-utr { font-size: 10px; color: #9ca3af; font-weight: 600; }
        .pr-notes { font-size: 11px; color: #9ca3af; font-style: italic; margin-top: 6px; }

        /* ── SALES LIST ── */
        .pr-sale {
          background: #f9f7ff; border: 1px solid rgba(139,92,246,0.08);
          border-radius: 14px; padding: 14px 16px; margin-bottom: 8px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .pr-sale-phone { font-size: 13px; font-weight: 700; color: #1e1b2e; }
        .pr-sale-amount { font-family: 'Bebas Neue', sans-serif; font-size: 18px; color: #059669; }
        .pr-sale-date { font-size: 9px; color: #9ca3af; font-weight: 600; text-transform: uppercase; }

        .pr-scroll { max-height: 300px; overflow-y: auto; padding-right: 4px; }
        .pr-scroll::-webkit-scrollbar { width: 3px; }
        .pr-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.25); border-radius: 10px; }

        .pr-no-pay { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 220px; gap: 10px; text-align: center; }

        /* ── STEPS — 2 column desktop layout ── */

        /* outer 3-col grid on desktop */
        .pr-steps-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media(min-width: 900px) {
          .pr-steps-layout {
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            align-items: start;
          }
        }

        /* each step card */
        .pr-step-card {
          background: white;
          border: 1px solid rgba(139,92,246,0.12);
          border-radius: 20px;
          padding: 28px 28px 28px 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s;
          display: flex;
          gap: 20px;
          box-shadow: 0 2px 16px rgba(139,92,246,0.05);
        }
        .pr-step-card:hover {
          border-color: rgba(124,58,237,0.28);
          box-shadow: 0 8px 32px rgba(124,58,237,0.1);
          transform: translateY(-2px);
        }
        /* top accent line */
        .pr-step-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.3), transparent);
          opacity: 0; transition: opacity 0.3s;
        }
        .pr-step-card:hover::before { opacity: 1; }

        /* active card — step 1 */
        .pr-step-card.active-card {
          border-color: rgba(124,58,237,0.25);
          background: linear-gradient(135deg, white 60%, #faf8ff);
          box-shadow: 0 4px 24px rgba(124,58,237,0.1);
        }
        .pr-step-card.active-card::before { opacity: 1; background: linear-gradient(90deg, transparent, #7c3aed, transparent); }

        /* done card — step 4 */
        .pr-step-card.done-card {
          border-color: rgba(5,150,105,0.2);
          background: linear-gradient(135deg, white 60%, #f0fdf4);
        }
        .pr-step-card.done-card::before { opacity: 1; background: linear-gradient(90deg, transparent, #059669, transparent); }

        /* left: number circle column */
        .pr-step-num-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          padding-top: 2px;
        }

        .pr-step-circle {
          width: 44px; height: 44px; border-radius: 50%;
          background: #f5f3ff;
          border: 2px solid rgba(139,92,246,0.18);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue', sans-serif;
          font-size: 18px; color: #9ca3af; letter-spacing: 0.05em;
          flex-shrink: 0;
          transition: all 0.3s;
        }
        .pr-step-circle.active {
          background: #7c3aed; border-color: #7c3aed; color: white;
          box-shadow: 0 6px 20px rgba(124,58,237,0.35);
        }
        .pr-step-circle.done {
          background: #059669; border-color: #059669; color: white;
          box-shadow: 0 6px 20px rgba(5,150,105,0.28);
          font-size: 17px;
        }

        /* right: content */
        .pr-step-content { flex: 1; min-width: 0; }

        .pr-step-tag {
          display: inline-block;
          font-size: 9px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase;
          color: #7c3aed;
          background: rgba(139,92,246,0.08);
          border: 1px solid rgba(139,92,246,0.18);
          padding: 3px 10px; border-radius: 100px;
          margin-bottom: 8px;
        }
        .pr-step-tag.green { color: #059669; background: rgba(5,150,105,0.08); border-color: rgba(5,150,105,0.18); }

        .pr-step-title {
          font-family: 'Bebas Neue', sans-serif;
          font-size: 24px; color: #1e1b2e; letter-spacing: 0.03em; line-height: 1;
          margin-bottom: 10px;
        }

        .pr-step-desc {
          font-size: 13px; color: #6b7280; font-weight: 400; line-height: 1.72;
          margin-bottom: 18px;
        }

        .pr-step-btn {
          display: inline-flex; align-items: center; gap: 8px;
          background: #7c3aed; color: white;
          padding: 11px 22px; border-radius: 10px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.14em;
          text-decoration: none; transition: all 0.25s;
          box-shadow: 0 6px 20px rgba(124,58,237,0.28);
        }
        .pr-step-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(124,58,237,0.4); }
        .pr-step-btn:active { transform: scale(0.97); }

        .pr-step-contact {
          display: inline-flex; align-items: center; gap: 12px;
          background: #f5f3ff; border: 1px solid rgba(139,92,246,0.18);
          padding: 12px 16px; border-radius: 12px;
        }

        .pr-step-info {
          display: inline-flex; align-items: flex-start; gap: 8px;
          background: rgba(139,92,246,0.05);
          border: 1px solid rgba(139,92,246,0.12);
          padding: 10px 14px; border-radius: 10px;
          font-size: 12px; color: #7c3aed; font-weight: 500; line-height: 1.5;
        }

        /* connector arrows between cards on desktop */
        @media(min-width:900px) {
          .pr-step-connector {
            display: flex; align-items: center; justify-content: center;
            color: rgba(139,92,246,0.25); font-size: 20px;
            padding: 8px 0;
          }
        }
        .pr-step-connector { display: none; }

        @keyframes prFadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="pr-root">
        <div className="pr-blob" />
        <div className="pr-blob2" />

        <div className="pr-inner">

          {/* ── HEADER ── */}
          <div className="pr-header">
            <div>
              <div className="pr-logo-row">
                <span className="pr-eyebrow">
                  <span className="pr-eyebrow-dot" />
                  Partner Portal
                </span>
              </div>
              <h1 className="pr-title">Partner <span>Dashboard</span></h1>
              <p className="pr-subtitle">Enter your referral credentials to track your performance and earnings in real-time.</p>
            </div>

            <form onSubmit={fetchSummary} className="pr-form">
              <input 
                type="email" 
                className="pr-input" 
                placeholder="Partner Email…" 
                value={email} 
                onChange={e => setEmail(e.target.value.toLowerCase())} 
              />
              
              <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-1">
                <button type="button" onClick={() => setUseOtp(false)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!useOtp ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Password</button>
                <button type="button" onClick={() => setUseOtp(true)} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${useOtp ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>OTP</button>
              </div>

              {useOtp ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input 
                      className="pr-input" 
                      placeholder="Enter 4-digit OTP…" 
                      value={otp} 
                      onChange={e => setOtp(e.target.value)} 
                    />
                    {!otpSent ? (
                      <button 
                        type="button" 
                        onClick={sendOtp} 
                        className="px-4 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-100 transition-all" 
                        disabled={loading || !email}
                      >
                        Send
                      </button>
                    ) : (
                      <button 
                        type="button" 
                        onClick={() => { setOtpSent(false); setOtp('') }} 
                        className="px-3 text-[9px] font-black uppercase text-gray-400 hover:text-indigo-600 transition-all"
                      >
                        Resend
                      </button>
                    )}
                  </div>
                  {otpSent && (
                    <div className="text-[10px] text-emerald-600 font-bold ml-1 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      OTP sent to your email!
                    </div>
                  )}
                  <button type="submit" className="pr-btn" disabled={!otp || loading}>
                    {loading ? '⟳ Verifying…' : 'Access Dashboard →'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <PasswordInput
                    autoComplete="current-password"
                    inputClassName="pr-input"
                    placeholder="Portal Password…"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button type="submit" className="pr-btn" disabled={!password || loading}>
                    {loading ? '⟳ Authenticating…' : 'Access Dashboard →'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="pr-error">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error === 'not_found' ? 'Invalid coupon code or inactive partner.'
                : error === 'invalid_password' ? 'Incorrect portal password.' : error}
            </div>
          )}

          {/* ── ONBOARDING STEPS ── */}
          {!data && !loading && !error && (
            <div className="pr-onboard">
              <div className="pr-onboard-glow" />
              <div style={{ position: 'relative', zIndex: 1 }}>

                {/* heading */}
                <div style={{ marginBottom: 36 }}>
                  <span className="pr-eyebrow" style={{ display: 'inline-flex', marginBottom: 16 }}>
                    <span className="pr-eyebrow-dot" /> Onboarding Process
                  </span>
                  <h2 className="pr-onboard-title">How to Become a <em>Partner?</em></h2>
                  <p className="pr-onboard-sub">
                    Join India's most exclusive B2B tech distribution network. Follow these simple steps and start earning commissions on every order.
                  </p>
                </div>

                {/* 3 steps — 3 col on desktop */}
                <div className="pr-steps-layout">

                  {/* ── STEP 1 ── */}
                  <div className="pr-step-card active-card">
                    <div className="pr-step-num-col">
                      <div className="pr-step-circle active">1</div>
                    </div>
                    <div className="pr-step-content">
                      <div className="pr-step-tag">Get Started</div>
                      <div className="pr-step-title">Send Us an Email</div>
                      <div className="pr-step-desc">
                        Write to us from your business email address expressing your interest in becoming a Click2Kart partner. Our team personally reviews every request.
                      </div>
                      <div className="pr-step-contact">
                        <div className="pr-contact-icon" style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0 }}>
                          <svg width="16" height="16" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="pr-contact-label">Email us at</div>
                          <div className="pr-contact-value" style={{ fontSize: 13 }}>{CONFIG.SUPPORT_EMAIL}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── STEP 2 ── */}
                  <div className="pr-step-card">
                    <div className="pr-step-num-col">
                      <div className="pr-step-circle">2</div>
                    </div>
                    <div className="pr-step-content">
                      <div className="pr-step-tag">Verification</div>
                      <div className="pr-step-title">Identity Verification</div>
                      <div className="pr-step-desc">
                        Our onboarding team will reach out to verify your business credentials — GST number, business PAN, and address proof. A quick, completely guided process.
                      </div>
                      <div className="pr-step-info">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: 1 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verification is typically completed within <strong>24–48 hours.</strong>
                      </div>
                    </div>
                  </div>

                  {/* ── STEP 3 ── */}
                  <div className="pr-step-card done-card">
                    <div className="pr-step-num-col">
                      <div className="pr-step-circle done">✓</div>
                    </div>
                    <div className="pr-step-content">
                      <div className="pr-step-tag green">You're a Partner!</div>
                      <div className="pr-step-title">Start Ordering & Earning</div>
                      <div className="pr-step-desc">
                        Your partner account is fully live. Access exclusive wholesale pricing, place bulk orders across 500+ products, and earn commission on every successful referral — all tracked on this dashboard.
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {data && (
            <div style={{ animation: 'prFadeUp 0.6s ease both' }}>
              <div className="flex justify-end mb-6">
                <button
                  type="button"
                  onClick={logout}
                  title="Sign out"
                  aria-label="Sign out"
                  className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-red-100 bg-white text-red-500 shadow-sm transition-all hover:bg-red-50 hover:shadow-md active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>

              {/* Profile */}
              <div className="pr-profile">
                <div className="pr-profile-glow" />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="pr-avatar">{data.partnerName?.charAt(0) || 'P'}</div>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Partner Profile</div>
                      <div className="pr-partner-name">{data.partnerName || '—'}</div>
                      <div className="pr-meta">
                        {data.partnerPhone && (
                          <span className="pr-meta-chip">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            {data.partnerPhone}
                          </span>
                        )}
                        {data.partnerEmail && (
                          <span className="pr-meta-chip">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            {data.partnerEmail}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 10 }}>Active Coupons</div>
                      <div className="flex flex-col gap-2 items-end">
                        {data.coupons?.map(c => (
                          <div key={c.code} className="flex items-center gap-3">
                            <div className="pr-code-pill"># {c.code}</div>
                            <div className="pr-rate" style={{ marginTop: 0 }}><span className="pr-rate-dot" /> {c.commissionPercent}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pr-stats">
                    <div className="pr-stat">
                      <div className="pr-stat-label">Generated Sales</div>
                      <div className="pr-stat-val">₹{data.totalSales.toLocaleString()}</div>
                    </div>
                    <div className="pr-stat">
                      <div className="pr-stat-label">Total Earnings</div>
                      <div className="pr-stat-val">₹{data.totalCommission.toLocaleString()}</div>
                    </div>
                    <div className="pr-stat green">
                      <div className="pr-stat-label">Withdrawn</div>
                      <div className="pr-stat-val">₹{data.totalPaid.toLocaleString()}</div>
                    </div>
                    <div className="pr-stat blue">
                      <div className="pr-stat-label">Current Balance</div>
                      <div className="pr-stat-val">₹{data.balance.toLocaleString()}</div>
                    </div>
                    <div className="pr-stat" style={{ border: '1px solid rgba(139,92,246,0.1)', background: 'white' }}>
                      <div className="pr-stat-label">Total Referrals</div>
                      <div className="pr-stat-val">{data.bills?.length || 0}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts & Sales */}
              <div className="pr-charts">
                <div className="pr-card">
                  <div className="pr-card-head">
                    <span className="pr-card-title">Coupon Performance</span>
                  </div>
                  <div style={{ height: 260, width: '100%', marginTop: 10 }}>
                    {data.coupons?.some(c => c.sales > 0) ? (
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={data.coupons.filter(c => c.sales > 0)} dataKey="sales" nameKey="code" cx="50%" cy="50%" outerRadius={80} stroke="none">
                            {data.coupons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }} 
                            formatter={(v) => `₹${v.toLocaleString()}`}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                        <div style={{ fontSize: 32 }}>📊</div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>No Sales Data Yet</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pr-card">
                  <div className="pr-card-head">
                    <span className="pr-card-title">Recent Referrals</span>
                    {data.bills?.length > 0 && <span className="pr-count-tag">{data.bills.length} Orders</span>}
                  </div>
                  {data.bills && data.bills.length > 0 ? (
                    <div className="pr-scroll">
                      {data.bills.map((b, i) => (
                        <div key={i} className="pr-sale">
                          <div>
                            <div className="pr-sale-phone">{b.customerPhone}</div>
                            <div className="flex items-center gap-2">
                              <div className="pr-sale-date">{new Date(b.createdAt).toLocaleDateString()}</div>
                              <div style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '1px 6px', borderRadius: 4 }}>{b.couponCode}</div>
                            </div>
                          </div>
                          <div className="pr-sale-amount">₹{b.payable.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pr-empty-chart">No referral orders yet.</div>
                  )}
                </div>

                <div className="pr-card">
                  <div className="pr-card-head">
                    <span className="pr-card-title">Payout History</span>
                    {data.payouts?.length > 0 && <span className="pr-count-tag">{data.payouts.length} Payments</span>}
                  </div>
                  {data.payouts && data.payouts.length > 0 ? (
                    <div className="pr-scroll">
                      {data.payouts.map((p, i) => (
                        <div key={i} className="pr-payout">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div className="pr-payout-amount">₹{p.amount.toLocaleString()}</div>
                            <div className="pr-payout-date">{new Date(p.createdAt).toLocaleDateString()}</div>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                            <span className="pr-method">{p.method}</span>
                            {p.couponCode && <span style={{ fontSize: 9, fontWeight: 800, color: '#7c3aed', background: '#f5f3ff', padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(139,92,246,0.2)' }}>{p.couponCode}</span>}
                            {p.utr && <span className="pr-utr">UTR: {p.utr}</span>}
                            {p.razorpayPaymentId && <span className="pr-utr">ID: {p.razorpayPaymentId}</span>}
                          </div>
                          {p.notes && <div className="pr-notes">"{p.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pr-no-pay">
                      <div style={{ fontSize: 36 }}>💸</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b2e' }}>No Payouts Yet</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>Commission payments will appear here.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}