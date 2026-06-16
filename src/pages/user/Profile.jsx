import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getImageUrl } from '../../lib/cloudinary';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli',
  'Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];

/* ── Icons ── */
const Ico = ({ n, cls = 'w-5 h-5' }) => {
  const d = {
    home:     'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    user:     'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    map:      'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    pkg:      'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    heart:    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    help:     'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    gear:     'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    logout:   'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
    lock:     'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
    plus:     'M12 4v16m8-8H4',
    back:     'M10 19l-7-7m0 0l7-7m-7 7h18',
    chevL:    'M15 19l-7-7 7-7',
    chevR:    'M9 5l7 7-7 7',
    edit:     'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    trash:    'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    close:    'M6 18L18 6M6 6l12 12',
    send:     'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
    check:    'M5 13l4 4L19 7',
  };
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
      {d[n]?.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  );
};

/* ── Avatar ── */
const Avatar = ({ user, size = 'md' }) => {
  const sz = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' }[size];
  if (user?.avatar)
    return <img src={getImageUrl(user.avatar)} alt={user.name} className={`${sz} rounded-2xl object-cover ring-2 ring-white shadow-md`} />;
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br from-orange-500 to-blue-900 flex items-center justify-center font-black text-white ring-2 ring-white shadow-md`}>
      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  );
};

/* ── Field ── */
const Field = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{label}</label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all placeholder:text-slate-300';
const disabledCls = 'w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 font-semibold text-sm cursor-not-allowed';
const btnPrimary = 'w-full py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-orange-500 to-blue-900 hover:from-orange-600 hover:to-blue-950 active:scale-[0.98] transition-all shadow-lg shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed';
const btnOutline = 'flex-1 py-3.5 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all';

/* ════════════════════════════════════════ MAIN COMPONENT ════════════════════════════════════════ */
export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', addressLine1: '', addressLine2: '',
    city: '', district: '', state: '', pincode: '', isDefault: false
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketForm, setNewTicketForm] = useState({ subject: '', description: '', category: 'Other' });
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    if (!token) { navigate('/login', { state: { from: location.pathname } }); return; }
    loadProfile();
    loadAddresses();
  }, [token]);

  useEffect(() => {
    if (activeSection === 'support') loadTickets();
  }, [activeSection]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/api/user/me');
      setFormData({ name: data.name || '', phone: data.phone || '' });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadAddresses = async () => {
    try { const { data } = await api.get('/api/user/addresses'); setSavedAddresses(data); }
    catch (e) { console.error(e); }
  };

  const loadTickets = async () => {
    setTicketsLoading(true);
    try { const { data } = await api.get('/api/support-tickets/my-tickets'); setTickets(data); }
    catch (e) { console.error(e); }
    finally { setTicketsLoading(false); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try { await api.put('/api/user/profile', formData); await refreshProfile(); notify('Profile updated!', 'success'); }
    catch (e) { notify(e?.response?.data?.error || 'Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { notify('Passwords do not match', 'error'); return; }
    if (passwordForm.newPassword.length < 6) { notify('Minimum 6 characters', 'error'); return; }
    setChangingPassword(true);
    try {
      await api.put('/api/user/change-password', { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      notify('Password changed!', 'success');
      setShowPasswordChange(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
    finally { setChangingPassword(false); }
  };

  const handleAddressInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    let v = value;
    if (name === 'phone') v = value.replace(/\D/g, '').slice(0, 10);
    if (name === 'pincode') {
      v = value.replace(/\D/g, '').slice(0, 6);
      if (v.length === 6) {
        setPincodeLoading(true);
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${v}`);
          const d = await res.json();
          if (d[0]?.Status === 'Success') {
            const po = d[0].PostOffice[0];
            setAddressForm(p => ({ ...p, pincode: v, district: po.District, state: po.State }));
            setPincodeLoading(false); return;
          } else notify('Invalid pincode', 'error');
        } catch { console.error('pincode fetch failed'); }
        finally { setPincodeLoading(false); }
      }
    }
    setAddressForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : v }));
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (addressForm.phone.length !== 10) { notify('Phone must be 10 digits', 'error'); return; }
    if (addressForm.pincode.length !== 6) { notify('Pincode must be 6 digits', 'error'); return; }
    try {
      if (editingAddress) { await api.put(`/api/user/addresses/${editingAddress._id}`, addressForm); notify('Address updated!', 'success'); }
      else { await api.post('/api/user/addresses', addressForm); notify('Address added!', 'success'); }
      await loadAddresses(); await refreshProfile(); setShowAddressModal(false);
    } catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Delete this address?')) return;
    try { await api.delete(`/api/user/addresses/${id}`); await loadAddresses(); await refreshProfile(); notify('Address deleted', 'success'); }
    catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleSetDefault = async (id) => {
    try { await api.post(`/api/user/addresses/${id}/set-default`); await loadAddresses(); await refreshProfile(); notify('Default updated!', 'success'); }
    catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', district: '', state: '', pincode: '', isDefault: savedAddresses.length === 0 });
    setShowAddressModal(true);
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setAddressForm({ fullName: addr.fullName, phone: addr.phone, addressLine1: addr.addressLine1, addressLine2: addr.addressLine2, city: addr.city, district: addr.district, state: addr.state, pincode: addr.pincode, isDefault: addr.isDefault });
    setShowAddressModal(true);
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try { await api.post('/api/support-tickets', newTicketForm); notify('Ticket created!', 'success'); setShowNewTicketModal(false); setNewTicketForm({ subject: '', description: '', category: 'Other' }); loadTickets(); }
    catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleAddMessage = async (ticketId) => {
    if (!messageInput.trim()) return;
    try { const { data } = await api.post(`/api/support-tickets/${ticketId}/messages`, { message: messageInput }); setSelectedTicket(data); setMessageInput(''); loadTickets(); }
    catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleResolveTicket = async (ticketId) => {
    try { await api.put(`/api/support-tickets/${ticketId}/resolve`); notify('Ticket resolved!', 'success'); setSelectedTicket(null); loadTickets(); }
    catch (e) { notify(e?.response?.data?.error || 'Failed', 'error'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/');
  };

  /* Nav config */
  const navItems = [
    { id: 'overview',   label: 'Overview',   icon: 'home'  },
    { id: 'personal',   label: 'Profile',    icon: 'user'  },
    { id: 'addresses',  label: 'Addresses',  icon: 'map'   },
    { id: 'support',    label: 'Support',    icon: 'help'  },
    { id: 'settings',   label: 'Settings',   icon: 'gear'  },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <LoadingSpinner text="Loading profile…" />
    </div>
  );

  /* ── Status badge ── */
  const statusBadge = (status) => {
    const map = {
      Open:        'bg-amber-50 text-amber-600 border-amber-100',
      'In Progress':'bg-blue-50 text-blue-600 border-blue-100',
      Resolved:    'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
    return `px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`;
  };

  /* ════ RENDER ════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');

        .pf-root { font-family: 'DM Sans', system-ui, sans-serif; }
        .pf-display { font-family: 'Sora', system-ui, sans-serif; }

        @keyframes slideUp {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0);    }
        }
        .pf-panel { animation: slideUp 0.28s cubic-bezier(0.16,1,0.3,1) forwards; }

        /* hide scrollbar on mobile nav strip */
        .pf-nav-strip::-webkit-scrollbar { display:none; }
        .pf-nav-strip { -ms-overflow-style:none; scrollbar-width:none; }
      `}</style>

      <div className="pf-root min-h-screen bg-slate-50 pb-24 lg:pb-8">

        {/* ── TOP HEADER ── */}
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-orange-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-white/10 transition-colors flex-shrink-0">
              <Ico n="back" cls="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My Account</p>
              <h1 className="pf-display font-black text-base leading-tight truncate">{user?.name || 'User'}</h1>
            </div>
            <Avatar user={user} size="sm" />
          </div>

          {/* ── MOBILE: horizontal scrollable tab strip ── */}
          <div className="lg:hidden pf-nav-strip flex overflow-x-auto px-4 pb-0 gap-1">
            {navItems.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold rounded-t-xl transition-all
                  ${activeSection === id
                    ? 'bg-slate-50 text-orange-600'
                    : 'text-slate-400 hover:text-slate-200'}`}>
                <Ico n={icon} cls="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-5 lg:py-8 lg:flex lg:gap-6">

          {/* ── DESKTOP SIDEBAR ── */}
          <aside className="hidden lg:flex flex-col gap-3 w-56 flex-shrink-0">
            {/* User card */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <Avatar user={user} size="md" />
              <div className="min-w-0">
                <div className="pf-display font-black text-slate-800 text-sm truncate">{user?.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {navItems.map(({ id, label, icon }) => (
                <button key={id} onClick={() => setActiveSection(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left transition-all border-l-2
                    ${activeSection === id
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                  <Ico n={icon} cls="w-4 h-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
              <div className="border-t border-slate-100">
                <button onClick={() => navigate('/orders')} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left text-slate-600 hover:bg-slate-50 border-l-2 border-transparent transition-all">
                  <Ico n="pkg" cls="w-4 h-4 flex-shrink-0" /> My Orders
                </button>
                <button onClick={() => navigate('/wishlist')} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left text-slate-600 hover:bg-slate-50 border-l-2 border-transparent transition-all">
                  <Ico n="heart" cls="w-4 h-4 flex-shrink-0" /> Wishlist
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold text-left text-red-500 hover:bg-red-50 border-l-2 border-transparent transition-all">
                  <Ico n="logout" cls="w-4 h-4 flex-shrink-0" /> Logout
                </button>
              </div>
            </nav>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0">

            {/* ──── OVERVIEW ──── */}
            {activeSection === 'overview' && (
              <div className="pf-panel space-y-4">
                {/* Welcome card */}
                <div className="bg-gradient-to-br from-orange-500 to-blue-900 rounded-2xl p-5 text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2" />
                  <p className="text-orange-200 text-xs font-bold uppercase tracking-widest mb-1">Welcome back</p>
                  <h2 className="pf-display font-black text-2xl leading-tight mb-3">{user?.name?.split(' ')[0]} 👋</h2>
                  <p className="text-orange-200 text-sm">{user?.email}</p>
                </div>

                {/* Quick action grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'My Orders', sub: 'Track & manage', icon: 'pkg', color: 'bg-blue-50 text-blue-600', action: () => navigate('/orders') },
                    { label: 'Wishlist', sub: 'Saved items', icon: 'heart', color: 'bg-rose-50 text-rose-600', action: () => navigate('/wishlist') },
                    { label: 'Addresses', sub: `${savedAddresses.length} saved`, icon: 'map', color: 'bg-emerald-50 text-emerald-600', action: () => setActiveSection('addresses') },
                    { label: 'Support', sub: `${tickets.length} tickets`, icon: 'help', color: 'bg-violet-50 text-violet-600', action: () => setActiveSection('support') },
                  ].map(({ label, sub, icon, color, action }) => (
                    <button key={label} onClick={action}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 active:scale-[0.97] transition-all text-left">
                      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                        <Ico n={icon} cls="w-5 h-5" />
                      </div>
                      <div className="pf-display font-black text-slate-800 text-sm">{label}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{sub}</div>
                    </button>
                  ))}
                </div>

                {/* Profile summary */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="pf-display font-black text-slate-800 text-sm">Profile Info</h3>
                    <button onClick={() => setActiveSection('personal')} className="text-orange-600 text-xs font-bold hover:underline">Edit →</button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                        <Ico n="user" cls="w-4 h-4" />
                      </div>
                      <span className="text-slate-600 font-medium">{user?.name || '—'}</span>
                    </div>
                    {user?.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                        </div>
                        <span className="text-slate-600 font-medium">{user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile logout */}
                <div className="lg:hidden">
                  <button onClick={handleLogout}
                    className="w-full bg-white rounded-2xl p-4 border border-red-100 shadow-sm text-red-500 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 active:scale-[0.98] transition-all">
                    <Ico n="logout" cls="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}

            {/* ──── PERSONAL ──── */}
            {activeSection === 'personal' && (
              <div className="pf-panel bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="pf-display font-black text-slate-800">Personal Info</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Update your name and contact details</p>
                </div>
                <form onSubmit={handleSaveProfile} className="p-5 space-y-4">
                  <Field label="Full Name">
                    <input type="text" name="name" value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                      className={inputCls} placeholder="Your full name" />
                  </Field>
                  <Field label="Email Address">
                    <input type="email" value={user?.email || ''} disabled className={disabledCls} />
                  </Field>
                  <Field label="Phone Number">
                    <input type="tel" name="phone" value={formData.phone}
                      onChange={e => setFormData(p => ({ ...p, phone: e.target.value.replace(/\D/g,'').slice(0,10) }))}
                      className={inputCls} placeholder="10-digit mobile number" />
                  </Field>
                  <button type="submit" disabled={saving} className={btnPrimary}>
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* ──── ADDRESSES ──── */}
            {activeSection === 'addresses' && (
              <div className="pf-panel space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="pf-display font-black text-slate-800">Addresses</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{savedAddresses.length} saved</p>
                  </div>
                  <button onClick={handleAddAddress}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-200 active:scale-[0.97] transition-all">
                    <Ico n="plus" cls="w-4 h-4" /> Add New
                  </button>
                </div>

                {savedAddresses.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <Ico n="map" cls="w-7 h-7" />
                    </div>
                    <h3 className="pf-display font-black text-slate-700 mb-1">No addresses yet</h3>
                    <p className="text-slate-400 text-sm mb-4">Add an address for faster checkout</p>
                    <button onClick={handleAddAddress} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all">
                      Add Address
                    </button>
                  </div>
                ) : (
                  savedAddresses.map(addr => (
                    <div key={addr._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Ico n="map" cls="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="pf-display font-black text-slate-800 text-sm">{addr.fullName}</span>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className="text-slate-500 text-xs font-semibold">{addr.phone}</span>
                            {addr.isDefault && (
                              <span className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-black rounded-full border border-violet-100">Default</span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs leading-relaxed">
                            {addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}<br />
                            {addr.city}, {addr.district}, {addr.state} – {addr.pincode}
                          </p>
                          {!addr.isDefault && (
                            <button onClick={() => handleSetDefault(addr._id)}
                              className="mt-2 text-violet-600 text-xs font-bold hover:underline">
                              Set as default
                            </button>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => handleEditAddress(addr)}
                            className="p-2 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                            <Ico n="edit" cls="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteAddress(addr._id)}
                            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                            <Ico n="trash" cls="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ──── SUPPORT ──── */}
            {activeSection === 'support' && (
              <div className="pf-panel space-y-3">
                {!selectedTicket ? (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="pf-display font-black text-slate-800">Support</h2>
                        <p className="text-slate-400 text-xs mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
                      </div>
                      <button onClick={() => setShowNewTicketModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold text-xs shadow-md shadow-violet-200 active:scale-[0.97] transition-all">
                        <Ico n="plus" cls="w-4 h-4" /> New Ticket
                      </button>
                    </div>

                    {ticketsLoading ? (
                      <div className="py-10 flex justify-center"><LoadingSpinner text="Loading tickets…" /></div>
                    ) : tickets.length === 0 ? (
                      <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <Ico n="help" cls="w-7 h-7" />
                        </div>
                        <h3 className="pf-display font-black text-slate-700 mb-1">No tickets yet</h3>
                        <p className="text-slate-400 text-sm mb-4">Raise a ticket for orders, payments, returns…</p>
                        <button onClick={() => setShowNewTicketModal(true)} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 transition-all">
                          Create Ticket
                        </button>
                      </div>
                    ) : (
                      tickets.map(t => (
                        <button key={t._id} onClick={() => setSelectedTicket(t)}
                          className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left hover:border-violet-200 hover:shadow-md active:scale-[0.98] transition-all">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="pf-display font-black text-slate-800 text-sm truncate">{t.subject}</div>
                              <div className="text-slate-400 text-xs mt-1 line-clamp-1">{t.description}</div>
                              <div className="text-slate-300 text-[10px] mt-1.5">{new Date(t.updatedAt).toLocaleDateString()}</div>
                            </div>
                            <span className={statusBadge(t.status)}>{t.status}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </>
                ) : (
                  /* Ticket Detail */
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                      <button onClick={() => setSelectedTicket(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Ico n="chevL" cls="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="pf-display font-black text-slate-800 text-sm truncate">{selectedTicket.subject}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={statusBadge(selectedTicket.status)}>{selectedTicket.status}</span>
                          <span className="text-slate-300 text-[10px]">{selectedTicket.category}</span>
                        </div>
                      </div>
                      {selectedTicket.status !== 'Resolved' && (
                        <button onClick={() => handleResolveTicket(selectedTicket._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors">
                          <Ico n="check" cls="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </div>

                    {/* Messages */}
                    <div className="p-4 space-y-3 max-h-80 overflow-y-auto bg-slate-50/50">
                      {selectedTicket.messages?.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed
                            ${msg.sender === 'user'
                              ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-sm'
                              : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'}`}>
                            <p>{msg.message}</p>
                            <p className={`text-[10px] mt-1.5 font-semibold ${msg.sender === 'user' ? 'text-violet-200' : 'text-slate-300'}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Reply box */}
                    <div className="p-3 border-t border-slate-100 flex gap-2">
                      <input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleAddMessage(selectedTicket._id)}
                        placeholder="Type a reply…"
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all" />
                      <button onClick={() => handleAddMessage(selectedTicket._id)}
                        disabled={!messageInput.trim()}
                        className="p-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-40 transition-all active:scale-95 flex-shrink-0">
                        <Ico n="send" cls="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──── SETTINGS ──── */}
            {activeSection === 'settings' && (
              <div className="pf-panel space-y-3">
                <div>
                  <h2 className="pf-display font-black text-slate-800">Settings</h2>
                  <p className="text-slate-400 text-xs mt-0.5">Security & account preferences</p>
                </div>

                {!showPasswordChange ? (
                  <button onClick={() => setShowPasswordChange(true)}
                    className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left flex items-center gap-4 hover:border-slate-200 hover:shadow-md active:scale-[0.98] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                      <Ico n="lock" cls="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="pf-display font-black text-slate-800 text-sm">Change Password</div>
                      <div className="text-slate-400 text-xs mt-0.5">Update your account credentials</div>
                    </div>
                    <Ico n="chevR" cls="w-4 h-4 text-slate-300" />
                  </button>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <button onClick={() => { setShowPasswordChange(false); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                        <Ico n="chevL" cls="w-4 h-4" />
                      </button>
                      <h3 className="pf-display font-black text-slate-800 text-sm">Change Password</h3>
                    </div>
                    <form onSubmit={handlePasswordUpdate} className="p-5 space-y-4">
                      <Field label="Current Password">
                        <input type="password" name="currentPassword" value={passwordForm.currentPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                          className={inputCls} placeholder="Current password" />
                      </Field>
                      <Field label="New Password">
                        <input type="password" name="newPassword" value={passwordForm.newPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                          className={inputCls} placeholder="At least 6 characters" />
                      </Field>
                      <Field label="Confirm Password">
                        <input type="password" name="confirmPassword" value={passwordForm.confirmPassword}
                          onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                          className={inputCls} placeholder="Repeat new password" />
                      </Field>
                      {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                        <p className="text-red-500 text-xs font-semibold">Passwords don't match</p>
                      )}
                      <button type="submit"
                        disabled={changingPassword || passwordForm.newPassword !== passwordForm.confirmPassword || !passwordForm.newPassword}
                        className={btnPrimary}>
                        {changingPassword ? 'Updating…' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

          </main>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 z-40 safe-area-pb">
          <div className="flex">
            {navItems.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all
                  ${activeSection === id ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Ico n={icon} cls="w-5 h-5" />
                <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                {activeSection === id && <div className="w-1 h-1 rounded-full bg-violet-500" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════ ADDRESS MODAL ════ */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="pf-display font-black text-slate-800">{editingAddress ? 'Edit Address' : 'New Address'}</h2>
              <button onClick={() => setShowAddressModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <Ico n="close" cls="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-5 space-y-3">
              <Field label="Full Name">
                <input type="text" name="fullName" value={addressForm.fullName} onChange={handleAddressInputChange} className={inputCls} required />
              </Field>
              <Field label="Phone">
                <input type="tel" name="phone" value={addressForm.phone} onChange={handleAddressInputChange} className={inputCls} required />
              </Field>
              <Field label="Pincode">
                <div className="relative">
                  <input type="text" name="pincode" value={addressForm.pincode} onChange={handleAddressInputChange} className={inputCls} required />
                  {pincodeLoading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <input type="text" name="city" value={addressForm.city} onChange={handleAddressInputChange} className={inputCls} required />
                </Field>
                <Field label="District">
                  <input type="text" name="district" value={addressForm.district} onChange={handleAddressInputChange} className={inputCls} required />
                </Field>
              </div>
              <Field label="State">
                <select name="state" value={addressForm.state} onChange={handleAddressInputChange} className={inputCls} required>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Address Line 1">
                <input type="text" name="addressLine1" value={addressForm.addressLine1} onChange={handleAddressInputChange} className={inputCls} required />
              </Field>
              <Field label="Address Line 2 (optional)">
                <input type="text" name="addressLine2" value={addressForm.addressLine2} onChange={handleAddressInputChange} className={inputCls} />
              </Field>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" name="isDefault" checked={addressForm.isDefault} onChange={handleAddressInputChange}
                  className="w-4 h-4 rounded accent-violet-600" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Set as default</span>
              </label>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddressModal(false)} className={btnOutline}>Cancel</button>
                <button type="submit" className="flex-1 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 transition-all active:scale-[0.98]">
                  {editingAddress ? 'Update' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ NEW TICKET MODAL ════ */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="pf-display font-black text-slate-800">New Support Ticket</h2>
              <button onClick={() => setShowNewTicketModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                <Ico n="close" cls="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              <Field label="Subject">
                <input type="text" value={newTicketForm.subject}
                  onChange={e => setNewTicketForm(p => ({ ...p, subject: e.target.value }))}
                  className={inputCls} required />
              </Field>
              <Field label="Category">
                <select value={newTicketForm.category}
                  onChange={e => setNewTicketForm(p => ({ ...p, category: e.target.value }))}
                  className={inputCls}>
                  {['Order','Product','Payment','Return/Refund','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Description">
                <textarea value={newTicketForm.description}
                  onChange={e => setNewTicketForm(p => ({ ...p, description: e.target.value }))}
                  className={`${inputCls} h-28 resize-none`} required />
              </Field>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewTicketModal(false)} className={btnOutline}>Cancel</button>
                <button type="submit" className="flex-1 py-3.5 rounded-xl font-black text-sm text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 transition-all active:scale-[0.98]">
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}