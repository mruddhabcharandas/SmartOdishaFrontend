import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getImageUrl } from '../../lib/cloudinary';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli',
  'Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep',
  'Puducherry'
];

const Icon = ({ name }) => {
  switch (name) {
    case 'dashboard':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
    case 'personal':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
    case 'addresses':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7l9-4 9 4v10l-9 4-9-4V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" /></svg>;
    case 'orders':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
    case 'wishlist':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21s-6-4.35-8.5-8C1.5 10 2 6.5 5.2 4.5 8.5 2.5 11 4 12 6c1-2 3.5-3.5 6.8-1.5C22 6.5 22.5 10 20.5 13c-2.5 3.65-8.5 8-8.5 8z" /></svg>;
    case 'support':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093 0 .75.507 1.4 1.208 1.664.502.189.788.73.788 1.246v.227a.75.75 0 01-.346.644l-4.975 3.317a.75.75 0 01-.773.028A6.008 6.008 0 013 16c0-2.663 2.045-4.882 4.729-5.593A4.003 4.003 0 018.228 9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12h.01M9 12h.01M12 9h.01M12 15h.01" /></svg>;
    case 'settings':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
    case 'logout':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
    case 'lock':
      return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
    default:
      return null;
  }
};

export default function Profile() {
  const { user, token, refreshProfile } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [openSections, setOpenSections] = useState({
    dashboard: true,
    personal: false,
    addresses: false,
    orders: false,
    wishlist: false,
    support: false,
    settings: false
  })

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    district: '',
    state: '',
    pincode: '',
    isDefault: false
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);
  
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicketForm, setNewTicketForm] = useState({
    subject: '',
    description: '',
    category: 'Other'
  });
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    loadProfile();
    loadAddresses();
    if (openSections.support) {
      loadTickets();
    }
  }, [token, openSections.support]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/api/user/me');
      setFormData({
        name: data.name || '',
        phone: data.phone || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const { data } = await api.get('/api/user/addresses');
      setSavedAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  const loadTickets = async () => {
    try {
      setTicketsLoading(true);
      const { data } = await api.get('/api/support-tickets/my-tickets');
      setTickets(data);
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/api/support-tickets', newTicketForm);
      notify('Ticket created successfully!', 'success');
      setShowNewTicketModal(false);
      setNewTicketForm({ subject: '', description: '', category: 'Other' });
      loadTickets();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to create ticket', 'error');
    }
  };

  const handleAddMessage = async (ticketId) => {
    if (!messageInput.trim()) return;
    try {
      const { data } = await api.post(`/api/support-tickets/${ticketId}/messages`, { message: messageInput });
      setSelectedTicket(data);
      setMessageInput('');
      loadTickets();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to send message', 'error');
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await api.put(`/api/support-tickets/${ticketId}/resolve`);
      notify('Ticket resolved!', 'success');
      setSelectedTicket(null);
      loadTickets();
    } catch (err) {
      notify(err?.response?.data?.error || 'Failed to resolve ticket', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressInputChange = async (e) => {
    const { name, value, type, checked } = e.target;
    let processedValue = value;
    if (name === 'phone') {
      processedValue = value.replace(/\D/g, '').slice(0, 10);
    }
    if (name === 'pincode') {
      processedValue = value.replace(/\D/g, '').slice(0, 6);
      
      if (processedValue.length === 6) {
        setPincodeLoading(true);
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${processedValue}`);
          const data = await response.json();
          
          if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
            const postOffice = data[0].PostOffice[0];
            setAddressForm(prev => ({
              ...prev,
              pincode: processedValue,
              district: postOffice.District,
              state: postOffice.State
            }));
            return;
          } else {
            notify('Invalid pincode', 'error');
          }
        } catch (err) {
          console.error('Failed to fetch pincode details', err);
        } finally {
          setPincodeLoading(false);
        }
      }
    }
    
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : processedValue
    }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/api/user/profile', formData);
      await refreshProfile();
      notify('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      notify(err?.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      notify('New passwords do not match', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      notify('New password must be at least 6 characters', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      await api.put('/api/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      notify('Password changed successfully!', 'success');
      setShowPasswordChange(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Failed to change password:', err);
      notify(err?.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      fullName: '',
      phone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      district: '',
      state: '',
      pincode: '',
      isDefault: savedAddresses.length === 0
    });
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setAddressForm({
      fullName: address.fullName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      district: address.district,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault
    });
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (addressForm.phone.length !== 10) {
      notify('Phone number must be 10 digits', 'error');
      return;
    }
    if (addressForm.pincode.length !== 6) {
      notify('Pincode must be 6 digits', 'error');
      return;
    }
    try {
      if (editingAddress) {
        await api.put(`/api/user/addresses/${editingAddress._id}`, addressForm);
        notify('Address updated successfully!', 'success');
      } else {
        await api.post('/api/user/addresses', addressForm);
        notify('Address added successfully!', 'success');
      }
      await loadAddresses();
      await refreshProfile();
      setShowAddressModal(false);
    } catch (err) {
      console.error('Failed to save address:', err);
      notify(err?.response?.data?.error || 'Failed to save address', 'error');
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.delete(`/api/user/addresses/${addressId}`);
      await loadAddresses();
      await refreshProfile();
      notify('Address deleted successfully!', 'success');
    } catch (err) {
      console.error('Failed to delete address:', err);
      notify(err?.response?.data?.error || 'Failed to delete address', 'error');
    }
  };

  const handleSetDefault = async (addressId) => {
    try {
      await api.post(`/api/user/addresses/${addressId}/set-default`);
      await loadAddresses();
      await refreshProfile();
      notify('Default address updated!', 'success');
    } catch (err) {
      console.error('Failed to set default address:', err);
      notify(err?.response?.data?.error || 'Failed to set default address', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner text="Loading your profile..." />
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 pb-12 profile-premium">
      <style>{`
        .profile-premium {
          font-family: 'Inter', system-ui, sans-serif;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .profile-header-pattern {
          background-image: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(99,102,241,0.3) 0%, transparent 40%);
        }
        .profile-nav-active {
          background: linear-gradient(90deg, rgba(79,70,229,0.08) 0%, rgba(99,102,241,0.04) 100%);
          color: #4f46e5;
          border-left: 3px solid #4f46e5;
        }
        .profile-stat-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border: 1px solid rgba(226,232,240,0.8);
          transition: all 0.25s ease;
        }
        .profile-stat-card:hover {
          border-color: #c7d2fe;
          box-shadow: 0 8px 24px rgba(79,70,229,0.08);
          transform: translateY(-2px);
        }
        .profile-premium-badge {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #78350f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 999px;
          text-transform: uppercase;
        }
      `}</style>

      {/* Premium Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white py-8 px-4 shadow-xl profile-header-pattern overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.15\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />
        <div className="max-w-6xl mx-auto relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate('/')} className="text-white/80 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-black tracking-tight">My Account</h1>
                </div>
                <p className="text-indigo-200/80 text-sm font-medium">Manage orders, addresses & preferences</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt={user.name} className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-lg" />
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center font-black text-lg border-2 border-white/20 shadow-lg">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden sm:block text-right">
                <div className="font-bold text-base">{user?.name || 'User'}</div>
                <div className="text-xs text-indigo-300/90">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 dashboard-container">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Sidebar Menu */}
          <div className="lg:col-span-1 space-y-5">
            {/* User Avatar Summary Card */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-indigo-100/50 border border-white p-5 flex items-center gap-4">
              {user?.avatar ? (
                <img src={getImageUrl(user.avatar)} alt={user.name} className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-100 shadow-md" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-indigo-200">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[10px] text-indigo-400 font-extrabold uppercase tracking-widest">Welcome back</div>
                <div className="font-black text-slate-800 truncate text-lg leading-tight mt-0.5">{user?.name || 'User'}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</div>
              </div>
            </div>

            {/* Menu options list */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg shadow-indigo-100/50 border border-white overflow-hidden divide-y divide-slate-100/80">
              <button
                onClick={() => toggleSection('dashboard')}
                className={`w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm transition-all ${openSections.dashboard ? 'profile-nav-active' : 'text-slate-600 hover:bg-slate-50/80'}`}
              >
                <Icon name="dashboard" />
                <span>Account Overview</span>
              </button>
              <button
                onClick={() => toggleSection('personal')}
                className={`w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm transition-all ${openSections.personal ? 'profile-nav-active' : 'text-slate-600 hover:bg-slate-50/80'}`}
              >
                <Icon name="personal" />
                <span>Personal Information</span>
              </button>
              <button
                onClick={() => toggleSection('addresses')}
                className={`w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm transition-all ${openSections.addresses ? 'profile-nav-active' : 'text-slate-600 hover:bg-slate-50/80'}`}
              >
                <Icon name="addresses" />
                <span>Manage Addresses</span>
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm text-slate-600 hover:bg-slate-50/50 transition-colors"
              >
                <Icon name="orders" />
                <span>My Orders</span>
              </button>
              <button
                onClick={() => navigate('/wishlist')}
                className="w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm text-slate-600 hover:bg-slate-50/50 transition-colors"
              >
                <Icon name="wishlist" />
                <span>My Wishlist</span>
              </button>
              <button
                onClick={() => toggleSection('support')}
                className={`w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm transition-all ${openSections.support ? 'profile-nav-active' : 'text-slate-600 hover:bg-slate-50/80'}`}
              >
                <Icon name="support" />
                <span>Help &amp; Support</span>
              </button>
              <button
                onClick={() => toggleSection('settings')}
                className={`w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm transition-all ${openSections.settings ? 'profile-nav-active' : 'text-slate-600 hover:bg-slate-50/80'}`}
              >
                <Icon name="settings" />
                <span>Settings</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full px-5 py-4 flex items-center gap-3.5 text-left font-bold text-sm text-red-600 hover:bg-red-50/55 transition-colors"
              >
                <Icon name="logout" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          {/* Right Active Content Panel */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Dashboard active */}
            {openSections.dashboard && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-100/40 border border-white animate-fade-in">
                <h2 className="text-2xl font-black text-slate-800 mb-1">Welcome Back, {user?.name?.split(' ')[0] || 'User'}!</h2>
                <p className="text-slate-500 mb-8 font-medium">Your premium SmartOdisha account — manage everything in one place.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  <div className="profile-stat-card p-5 rounded-2xl cursor-pointer" onClick={() => navigate('/orders')}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Icon name="orders" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Orders</div>
                        <div className="font-black text-slate-800 text-lg">Track Orders</div>
                      </div>
                    </div>
                  </div>
                  <div className="profile-stat-card p-5 rounded-2xl cursor-pointer" onClick={() => navigate('/wishlist')}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
                        <Icon name="wishlist" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wishlist</div>
                        <div className="font-black text-slate-800 text-lg">Saved Items</div>
                      </div>
                    </div>
                  </div>
                  <div className="profile-stat-card p-5 rounded-2xl cursor-pointer" onClick={() => toggleSection('addresses')}>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Icon name="addresses" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Addresses</div>
                        <div className="font-black text-slate-800 text-lg">{savedAddresses.length} Saved</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="p-5 border border-indigo-100/80 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-white hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
                        <Icon name="personal" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-base">Profile</div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">{user?.name}</div>
                        <button onClick={() => toggleSection('personal')} className="text-indigo-600 font-bold text-xs mt-2 hover:underline block">Edit details →</button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border border-indigo-100/80 rounded-2xl bg-gradient-to-br from-violet-50/50 to-white hover:border-violet-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
                        <Icon name="addresses" />
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-800 text-base">Addresses</div>
                        <div className="text-xs text-slate-500 font-semibold mt-0.5">{savedAddresses.length} saved address(es)</div>
                        <button onClick={() => toggleSection('addresses')} className="text-indigo-600 font-bold text-xs mt-2 hover:underline block">Manage addresses →</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Personal info active */}
            {openSections.personal && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-100/40 border border-white animate-fade-in">
                <h2 className="text-xl font-extrabold text-slate-800 mb-6">Personal Information</h2>
                <form onSubmit={handleSaveProfile} className="space-y-5 max-w-lg">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 text-slate-800 font-semibold outline-none transition-all"
                      placeholder="Full Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-xl bg-slate-100 text-slate-400 font-semibold cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 text-slate-800 font-semibold outline-none transition-all"
                      placeholder="Phone Number"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </form>
              </div>
            )}

            {/* Addresses active */}
            {openSections.addresses && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-100/40 border border-white animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-extrabold text-slate-800">Saved Addresses</h2>
                  <button
                    onClick={handleAddAddress}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    New Address
                  </button>
                </div>

                {savedAddresses.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                      <Icon name="addresses" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No Saved Addresses</h3>
                    <p className="text-slate-400 text-sm mb-6">Save delivery addresses to speed up checkout</p>
                    <button
                      onClick={handleAddAddress}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {savedAddresses.map((address) => (
                      <div key={address._id} className="p-5 border border-slate-100 rounded-2xl hover:border-slate-200 transition-all bg-slate-50/20 hover:bg-slate-50/50">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <div className="font-extrabold text-slate-800 truncate text-base">{address.fullName}</div>
                              <span className="text-slate-300 hidden sm:inline">•</span>
                              <div className="text-slate-700 font-bold text-sm">{address.phone}</div>
                              {address.isDefault && (
                                <span className="px-2.5 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold rounded-full">Default</span>
                              )}
                            </div>
                            <div className="text-slate-500 font-medium text-sm space-y-0.5">
                              <div>{address.addressLine1}</div>
                              {address.addressLine2 && <div>{address.addressLine2}</div>}
                              <div className="font-semibold text-slate-700">{address.city}, {address.district}, {address.state} - {address.pincode}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditAddress(address)}
                              className="p-2 text-blue-600 hover:bg-blue-100/50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteAddress(address._id)}
                              className="p-2 text-red-600 hover:bg-red-100/50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefault(address._id)}
                            className="mt-3 text-blue-600 text-xs font-bold hover:underline"
                          >
                            Set as Default
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Support active */}
            {openSections.support && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-100/40 border border-white animate-fade-in">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-extrabold text-slate-800">Support Requests</h2>
                  <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    New Ticket
                  </button>
                </div>

                {ticketsLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner text="Loading tickets..." />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                      <Icon name="support" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">No Active Tickets</h3>
                    <p className="text-slate-400 text-sm mb-6">Create a support ticket for items, payments, returns, etc.</p>
                    <button
                      onClick={() => setShowNewTicketModal(true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
                    >
                      Create Ticket
                    </button>
                  </div>
                ) : selectedTicket ? (
                  <div className="space-y-4">
                    <button
                      onClick={() => setSelectedTicket(null)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to all tickets
                    </button>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-extrabold text-slate-800 leading-tight">{selectedTicket.subject}</h3>
                            <div className="text-xs text-slate-400 font-semibold mt-1">
                              Category: {selectedTicket.category} • Status: {selectedTicket.status}
                            </div>
                          </div>
                          {selectedTicket.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolveTicket(selectedTicket._id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-green-500/10"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-5 max-h-96 overflow-y-auto space-y-4 bg-slate-50/20">
                        {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-4 rounded-2xl ${msg.sender === 'user' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'bg-white border border-slate-100 text-slate-800'}`}>
                              <p className="text-sm font-semibold leading-relaxed">{msg.message}</p>
                              <p className={`text-[10px] mt-2 font-bold ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                                {new Date(msg.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t border-slate-100 bg-white">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddMessage(selectedTicket._id)}
                            placeholder="Type your reply here..."
                            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 font-semibold text-sm outline-none"
                          />
                          <button
                            onClick={() => handleAddMessage(selectedTicket._id)}
                            disabled={!messageInput.trim()}
                            className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/10 disabled:opacity-50"
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket._id}
                        onClick={() => setSelectedTicket(ticket)}
                        className="p-5 border border-slate-100 rounded-2xl hover:border-blue-200 hover:bg-blue-50/30 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="font-extrabold text-slate-800 text-base mb-1">{ticket.subject}</div>
                          <p className="text-slate-500 text-sm mb-2 font-medium line-clamp-1">{ticket.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold">Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold flex-shrink-0 self-start sm:self-center border ${
                          ticket.status === 'Open' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' : 
                          ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {ticket.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings active */}
            {openSections.settings && (
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-100/40 border border-white animate-fade-in">
                <h2 className="text-xl font-extrabold text-slate-800 mb-6">Security Settings</h2>
                <div className="space-y-4 max-w-lg">
                  {!showPasswordChange ? (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full p-5 border border-slate-100 rounded-2xl hover:border-slate-200 hover:bg-slate-50/40 transition-all text-left flex items-center gap-4"
                    >
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Icon name="lock" />
                      </div>
                      <div className="flex-1">
                        <div className="font-extrabold text-slate-800">Change Password</div>
                        <div className="text-xs text-slate-400 font-semibold mt-0.5">Update and secure your account credentials</div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="border border-slate-100 rounded-2xl p-6 bg-slate-50/10">
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                        }}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm mb-6"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                      <form onSubmit={handlePasswordUpdate} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Current Password</label>
                          <input
                            type="password"
                            name="currentPassword"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 font-semibold text-slate-800 outline-none"
                            placeholder="Current Password"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                          <input
                            type="password"
                            name="newPassword"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 font-semibold text-slate-800 outline-none"
                            placeholder="New Password (min 6 characters)"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Confirm New Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50 font-semibold text-slate-800 outline-none"
                            placeholder="Confirm New Password"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={changingPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-extrabold rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
                        >
                          {changingPassword ? 'Updating Password...' : 'Update Password'}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800">
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              </h2>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Pincode</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="pincode"
                      value={addressForm.pincode}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                      required
                    />
                    {pincodeLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">City</label>
                  <input
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">District</label>
                  <input
                    type="text"
                    name="district"
                    value={addressForm.district}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">State</label>
                  <select
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  >
                    <option value="">Select State</option>
                    {INDIAN_STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Address Line 1</label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressInputChange}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-xs font-bold text-slate-500 cursor-pointer uppercase tracking-wider">
                  Set as default address
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/10"
                >
                  {editingAddress ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800">Create New Support Ticket</h2>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Subject</label>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Category</label>
                <select
                  value={newTicketForm.category}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm outline-none"
                >
                  <option value="Order">Order</option>
                  <option value="Product">Product</option>
                  <option value="Payment">Payment</option>
                  <option value="Return/Refund">Return/Refund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Description</label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-sm h-32 outline-none resize-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-500/10"
                >
                  Submit Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}