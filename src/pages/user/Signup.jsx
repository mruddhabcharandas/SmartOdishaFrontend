import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import PasswordInput from '../../components/PasswordInput';
import { useAuth } from '../../lib/AuthContext';

export default function Signup() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, refreshProfile } = useAuth();

  const [from] = useState(() => {
    const stateFrom = location.state?.from;
    if (stateFrom && typeof stateFrom === 'string' && !stateFrom.includes('/login') && !stateFrom.includes('/signup')) {
      sessionStorage.setItem('login_redirect', stateFrom);
      return stateFrom;
    }
    return sessionStorage.getItem('login_redirect') || '/';
  });

  const googleData = location.state?.googleData;

  const [step, setStep] = useState(googleData ? 'phone' : 1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: googleData?.name || '',
    phone: '',
    email: googleData?.email || '',
    password: '',
    avatar: googleData?.avatar || ''
  });
  const [otp, setOtp] = useState('');

  const handleGoogleSignup = useGoogleLogin({
    onSuccess: async (response) => {
      setGoogleLoading(true);
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${response.access_token}`
          }
        });
        const userInfo = await userInfoResponse.json();
        
        try {
          const { data } = await api.post('/api/auth/customer/google', { 
            email: userInfo.email,
            name: userInfo.name,
            avatar: userInfo.picture
          });
          setAuth(data.token, { ...data.user, role: 'customer' });
          try { await refreshProfile() } catch {}
          sessionStorage.removeItem('login_redirect');
          notify('Welcome!', 'success');
          navigate(from);
        } catch (err) {
          if (err?.response?.data?.error === 'phone_required') {
            setStep('phone');
            setFormData({
              name: err.response.data.name,
              phone: '',
              email: err.response.data.email,
              password: ''
            });
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error('Google signup error:', err);
        let errorMessage = 'Google login failed';
        const error = err?.response?.data?.error;
        if (error) {
          if (error === 'phone_already_used') errorMessage = 'This phone number is already in use';
          else if (error === 'user_already_exists') errorMessage = 'An account with this email or phone already exists';
          else if (error === 'invalid_phone') errorMessage = 'Please enter a valid 10-digit phone number';
          else errorMessage = error;
        }
        notify(errorMessage, 'error');
      } finally {
        setGoogleLoading(false);
      }
    },
    onError: () => {
      notify('Google login failed', 'error');
    },
  });

  const handleGooglePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/customer/google/signup', { 
        email: formData.email,
        name: formData.name,
        phone: formData.phone,
        avatar: formData.avatar
      });
      setAuth(data.token, { ...data.user, role: 'customer' });
      try { await refreshProfile() } catch {}
      sessionStorage.removeItem('login_redirect');
      notify('Account created successfully!', 'success');
      navigate(from);
    } catch (err) {
      let errorMessage = 'Failed to create account';
      const error = err?.response?.data?.error;
      if (error) {
        if (error === 'phone_already_used') errorMessage = 'This phone number is already registered';
        else if (error === 'user_already_exists') errorMessage = 'Account already exists';
        else if (error === 'missing_fields') errorMessage = 'Please fill all required fields';
        else if (error === 'invalid_phone') errorMessage = 'Please enter a valid 10-digit phone number';
        else errorMessage = error;
      }
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.name.trim()) {
      notify('Please enter your full name', 'error');
      return;
    }
    if (!formData.email.trim()) {
      notify('Please enter your email address', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      notify('Please enter a valid email address', 'error');
      return;
    }
    if (formData.phone.length !== 10) {
      notify('Phone number must be 10 digits', 'error');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      notify('Password must be at least 6 characters', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/api/auth/customer/signup', formData);
      notify('OTP sent to your email', 'success');
      setStep(2);
    } catch (err) {
      let errorMessage = 'Failed to send OTP';
      const error = err?.response?.data?.error;
      if (error) {
        if (error === 'user_already_exists') errorMessage = 'Account already exists with this email or phone';
        else if (error === 'invalid_email_format') errorMessage = 'Please enter a valid email address';
        else if (error === 'invalid_phone') errorMessage = 'Please enter a valid 10-digit phone number';
        else if (error === 'missing_fields') errorMessage = 'Please fill all required fields';
        else errorMessage = error;
      }
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/customer/verify-otp', {
        email: formData.email,
        otp
      });
      setAuth(data.token, { ...data.user, role: 'customer' });
      try { await refreshProfile() } catch {}
      sessionStorage.removeItem('login_redirect');
      notify('Account created successfully!', 'success');
      navigate(from);
    } catch (err) {
      let errorMessage = 'Invalid OTP';
      const error = err?.response?.data?.error;
      if (error) {
        if (error === 'invalid_otp') errorMessage = 'The OTP you entered is invalid';
        else if (error === 'missing_fields') errorMessage = 'Please enter the OTP';
        else errorMessage = error;
      }
      notify(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      const digitsOnly = e.target.value.replace(/\D/g, '');
      const limited = digitsOnly.slice(0, 10);
      setFormData({ ...formData, [e.target.name]: limited });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-[32px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-24 w-24 rounded-[28px] bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden mb-4 shadow-lg shadow-blue-100">
            <img src="/logo.png" alt="SmartOdisha" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {step === 'phone' ? 'One Step Away' : (step === 1 ? 'Create Account' : 'Verify Email')}
          </h2>
          <p className="text-base text-slate-500 font-medium">
            {step === 'phone' 
              ? 'Enter your phone number to complete your account' 
              : (step === 1 
                ? 'Join thousands of customers shopping with SmartOdisha' 
                : 'We have sent a 6-digit code to ' + formData.email)}
          </p>
        </div>

        {step === 1 && (
          <div className="mt-8">
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-[24px] border-2 border-slate-200 bg-white hover:bg-gradient-to-br from-blue-50 to-indigo-50 transition-all text-sm font-semibold text-slate-700 hover:text-slate-900 disabled:opacity-50 shadow-sm"
            >
              {googleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[11px] font-bold uppercase tracking-widest text-slate-400">Or continue with</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSendOTP}>
              <div className="space-y-4">
                <div className="group">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 mb-2 block">Full Name</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Uddhab Das"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 mb-2 block">Email Address</label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="support@smartodisha.in"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 mb-2 block">Phone Number</label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    maxLength={10}
                    className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="9827058262"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="group">
                  <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 mb-2 block">Create Password</label>
                  <PasswordInput
                    name="password"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    inputClassName="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[28px] text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send Verification Code'}
              </button>

              <p className="text-center text-sm text-slate-500 font-medium mt-6">
                Already have an account?{' '}
                <Link to="/login" state={{ from }} className="text-blue-700 hover:text-indigo-700 font-semibold">
                  Login
                </Link>
              </p>
            </form>
          </div>
        )}

        {step === 'phone' && (
          <form className="mt-8 space-y-6" onSubmit={handleGooglePhoneSubmit}>
            <div className="group">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 ml-1 mb-2 block">Phone Number</label>
              <input
                name="phone"
                type="tel"
                required
                maxLength={10}
                className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-4 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="9827058262"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={loading || formData.phone.length < 10}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[28px] text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Complete Signup'}
            </button>

            <div className="flex flex-col gap-4 text-center">
              <button 
                type="button"
                onClick={() => { setStep(1); }}
                className="text-sm text-slate-500 font-medium hover:text-slate-700"
              >
                Back to signup options
              </button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="group text-center">
              <label className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4 block">Enter 6-Digit OTP</label>
              <input
                type="text"
                required
                maxLength="6"
                className="w-full bg-slate-50 border border-slate-200 rounded-[20px] px-5 py-6 text-4xl font-bold text-center text-slate-900 tracking-[0.5em] placeholder-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[28px] text-sm font-bold uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Complete Registration'}
            </button>

            <div className="flex flex-col gap-4 text-center">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 font-medium hover:text-slate-700"
              >
                Change Details
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
