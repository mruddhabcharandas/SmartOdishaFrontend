import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getCloudinaryUrl } from '../../lib/cloudinary';

// Indian States
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

export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('dashboard');
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
  
  // Support Ticket State
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
    if (activeTab === 'support') {
      loadTickets();
    }
  }, [token, activeTab]);

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
      
      // If pincode is 6 digits, fetch details
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
            return; // Don't run the default set
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
        <LoadingSpinner text="Loading your profile..." />
      </div>
    );
  }

  const menuItems = [
    { id: 'personal', label: 'Personal Information', desc: 'Update your name, email, and phone number', icon: '👤' },
    { id: 'addresses', label: 'Saved Addresses', desc: 'Manage your delivery and billing addresses', icon: '🏠' },
    { id: 'orders', label: 'My Orders', desc: 'Track, cancel or reorder items', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', desc: 'View items saved to your wishlist', icon: '❤️' },
    { id: 'activity', label: 'My Activity', desc: 'Check your search history and activity', icon: '⚡' },
    { id: 'support', label: 'Support & Tickets', desc: 'Create and view your support requests', icon: '🎫' },
    { id: 'settings', label: 'Account Settings', desc: 'Manage your password and security', icon: '⚙️' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto animate-fade-in-up">
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-3">
            My Account
          </h1>
          <p className="text-slate-400 text-lg">Manage your profile, orders, and preferences</p>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="space-y-8">
            {/* User Profile Header Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-5xl shadow-2xl overflow-hidden border-4 border-white/20">
                  {user?.avatar ? (
                    <img 
                      src={getCloudinaryUrl(user.avatar)} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h2 className="text-3xl font-black text-white">{user?.name || 'User'}</h2>
                  <p className="text-slate-300 font-semibold">{user?.email}</p>
                  <p className="text-slate-400 font-medium">{user?.phone || 'No phone number added'}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-8 py-4 bg-gradient-to-r from-red-500/20 hover:from-red-500/30 text-red-300 hover:text-white font-bold rounded-2xl transition-all duration-300 flex items-center gap-3 border border-red-500/30 hover:border-red-500/50 hover:shadow-xl"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout Account
              </button>
            </div>

            {/* Menu Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className="p-8 bg-white/10 backdrop-blur-lg border border-white/20 hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300 text-left flex gap-5 group rounded-3xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 group-hover:from-blue-500 group-hover:to-indigo-600 group-hover:text-white flex items-center justify-center text-3xl transition-all duration-300 shadow-inner border border-white/10 group-hover:border-transparent">
                    {item.icon}
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-bold text-xl text-white group-hover:text-blue-300 transition-colors">{item.label}</h3>
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl text-sm font-bold text-slate-300 hover:text-white hover:border-blue-400/50 shadow-sm transition-all group"
            >
              <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to My Account
            </button>

            <div className="w-full space-y-6">
              {activeTab === 'personal' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Personal Information</h2>
                      <p className="text-slate-300 text-sm mt-1">Update your personal details here</p>
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-200">
                          Full Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-200">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl bg-white/5 text-slate-400 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-200">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-xl flex items-center gap-3 text-lg"
                      >
                        {saving ? (
                          <>
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'addresses' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Saved Addresses</h2>
                      <p className="text-slate-300 text-sm mt-1">Manage your delivery addresses</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAddAddress}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Address
                  </button>
                </div>
                <div className="p-8">
                  {savedAddresses.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-white/10">
                        <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">No saved addresses yet</h3>
                      <p className="text-slate-400 mb-10 max-w-md mx-auto text-lg">Add your first address to get started with faster checkout</p>
                      <button
                        onClick={handleAddAddress}
                        className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 text-lg"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {savedAddresses.map((address) => (
                        <div key={address._id} className={`p-7 border-2 rounded-2xl transition-all duration-300 ${address.isDefault ? 'border-blue-400/50 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 shadow-lg' : 'border-white/20 hover:border-blue-400/30 hover:shadow-md bg-white/5'}`}>
                          <div className="flex items-start justify-between mb-5">
                            <div>
                              <div className="flex items-center gap-3 mb-3">
                                <h4 className="font-bold text-xl text-white">{address.fullName}</h4>
                                {address.isDefault && (
                                  <span className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-lg">Default</span>
                                )}
                              </div>
                              <p className="text-slate-300 font-medium">{address.phone}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditAddress(address)}
                                className="p-3 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all duration-300"
                                title="Edit"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(address._id)}
                                className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-xl transition-all duration-300"
                                title="Delete"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className="text-slate-300 space-y-1.5 mb-5">
                            <p className="font-medium">{address.addressLine1}</p>
                            {address.addressLine2 && <p>{address.addressLine2}</p>}
                            <p>{address.city}, {address.district}, {address.state} - {address.pincode}</p>
                          </div>
                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefault(address._id)}
                              className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-300"
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">My Orders</h2>
                  </div>
                </div>
                <div className="p-8">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 text-lg"
                  >
                    View All Orders
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">My Wishlist</h2>
                  </div>
                </div>
                <div className="p-8">
                  <Link
                    to="/wishlist"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 text-lg"
                  >
                    View My Wishlist
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">My Activity</h2>
                  </div>
                </div>
                <div className="p-12 text-center">
                  <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-white/10">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Your activity will appear here</h3>
                  <p className="text-slate-400 text-lg">Keep shopping to see your browsing history!</p>
                </div>
              </div>
            )}

            {activeTab === 'support' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Support & Tickets</h2>
                      <p className="text-slate-300 text-sm mt-1">Manage your support tickets</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 flex items-center gap-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Ticket
                  </button>
                </div>
                <div className="p-8">
                  {ticketsLoading ? (
                    <div className="text-center py-12">
                      <LoadingSpinner text="Loading tickets..." />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="w-32 h-32 mx-auto mb-8 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full flex items-center justify-center border border-white/10">
                        <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">No tickets yet</h3>
                      <p className="text-slate-400 mb-10 max-w-md mx-auto text-lg">Create your first support ticket if you need help</p>
                      <button
                        onClick={() => setShowNewTicketModal(true)}
                        className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 text-lg"
                      >
                        Create Ticket
                      </button>
                    </div>
                  ) : selectedTicket ? (
                    <div className="space-y-6">
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold text-lg"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to all tickets
                      </button>
                      <div className="border border-white/20 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-2xl font-bold text-white">{selectedTicket.subject}</h3>
                              <p className="text-sm text-slate-300 mt-1">
                                Category: {selectedTicket.category} • Status: {selectedTicket.status}
                              </p>
                            </div>
                            {selectedTicket.status !== 'Resolved' && (
                              <button
                                onClick={() => handleResolveTicket(selectedTicket._id)}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 text-lg"
                              >
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-8 max-h-96 overflow-y-auto space-y-4">
                          {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] p-6 rounded-2xl ${msg.sender === 'user' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' : 'bg-white/10 text-white backdrop-blur-sm'}`}>
                                <p className="text-base">{msg.message}</p>
                                <p className={`text-xs mt-3 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                  {new Date(msg.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-6 border-t border-white/10">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddMessage(selectedTicket._id)}
                              placeholder="Type your message..."
                              className="flex-1 px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                              disabled={selectedTicket.status === 'Resolved'}
                            />
                            <button
                              onClick={() => handleAddMessage(selectedTicket._id)}
                              disabled={!messageInput.trim() || selectedTicket.status === 'Resolved'}
                              className="px-8 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-2xl shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tickets.map((ticket) => (
                        <div key={ticket._id} className="p-6 border border-white/20 rounded-2xl bg-white/5 hover:border-blue-400/30 hover:bg-white/10 transition-all duration-300 cursor-pointer" onClick={() => setSelectedTicket(ticket)}>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-lg text-white">{ticket.subject}</h4>
                              <p className="text-sm text-slate-400">{ticket.category}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${ticket.status === 'Open' ? 'bg-yellow-500/20 text-yellow-300' : ticket.status === 'In Progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-green-500/20 text-green-300'}`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-slate-400 text-sm mb-4 line-clamp-2">{ticket.description}</p>
                          <p className="text-xs text-slate-500">Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white">Account Settings</h2>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  {!showPasswordChange ? (
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full p-8 bg-white/5 border border-white/20 rounded-2xl hover:border-blue-400/30 hover:bg-white/10 transition-all duration-300 text-left flex items-center gap-6"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-2xl">
                        🔒
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl text-white">Change Password</h3>
                        <p className="text-sm text-slate-400 mt-1">Update your account password</p>
                      </div>
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <div className="space-y-6">
                      <form onSubmit={handlePasswordUpdate} className="space-y-6">
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-slate-200">Current Password</label>
                          <input
                            type="password"
                            name="currentPassword"
                            value={passwordForm.currentPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                            placeholder="Enter current password"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-slate-200">New Password</label>
                          <input
                            type="password"
                            name="newPassword"
                            value={passwordForm.newPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                            placeholder="Enter new password (min 6 characters)"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-slate-200">Confirm New Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={passwordForm.confirmPassword}
                            onChange={handlePasswordChange}
                            className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                            placeholder="Confirm new password"
                          />
                        </div>
                        <div className="flex gap-4 pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordChange(false);
                              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            }}
                            className="px-8 py-5 bg-white/5 border border-white/20 text-slate-300 hover:text-white hover:border-red-400/30 font-semibold rounded-2xl transition-all duration-300 text-lg"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg"
                          >
                            {changingPassword ? (
                              <>
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Changing...
                              </>
                            ) : (
                              'Change Password'
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Address Modal */}
        {showAddressModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
                <button onClick={() => setShowAddressModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSaveAddress} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">Full Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      name="fullName"
                      value={addressForm.fullName}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">Phone Number <span className="text-red-400">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={addressForm.phone}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                      placeholder="10-digit phone number"
                      required
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-200">Address Line 1 <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    name="addressLine1"
                    value={addressForm.addressLine1}
                    onChange={handleAddressInputChange}
                    className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                    placeholder="House number, street, etc."
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-200">Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    value={addressForm.addressLine2}
                    onChange={handleAddressInputChange}
                    className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                    placeholder="Landmark, area, etc. (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">Pincode <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      name="pincode"
                      value={addressForm.pincode}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                      placeholder="6-digit pincode"
                      required
                      maxLength={6}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">City <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                      placeholder="City"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">District</label>
                    <input
                      type="text"
                      name="district"
                      value={addressForm.district}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                      placeholder="District"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-200">State <span className="text-red-400">*</span></label>
                    <select
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressInputChange}
                      className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white"
                      required
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map(state => (
                        <option key={state} value={state} className="bg-slate-800">{state}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    checked={addressForm.isDefault}
                    onChange={handleAddressInputChange}
                    className="w-5 h-5 text-blue-500 rounded border-white/20 bg-white/10 focus:ring-blue-400/20"
                  />
                  <label htmlFor="isDefault" className="text-sm font-semibold text-slate-200">Set as default address</label>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(false)}
                    className="flex-1 px-8 py-5 bg-white/5 border border-white/20 text-slate-300 hover:text-white hover:border-red-400/30 font-semibold rounded-2xl transition-all duration-300 text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl transition-all duration-300 text-lg"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-8 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create Support Ticket</h2>
                <button onClick={() => setShowNewTicketModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-200">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={newTicketForm.subject}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                    className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400"
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-200">Category</label>
                  <select
                    value={newTicketForm.category}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                    className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white"
                  >
                    <option value="Order Issue" className="bg-slate-800">Order Issue</option>
                    <option value="Payment Issue" className="bg-slate-800">Payment Issue</option>
                    <option value="Product Query" className="bg-slate-800">Product Query</option>
                    <option value="Return/Refund" className="bg-slate-800">Return/Refund</option>
                    <option value="Other" className="bg-slate-800">Other</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-200">Description <span className="text-red-400">*</span></label>
                  <textarea
                    value={newTicketForm.description}
                    onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                    className="w-full px-6 py-5 border-2 border-white/20 rounded-2xl focus:border-blue-400 focus:ring-4 focus:ring-blue-400/20 focus:outline-none transition-all duration-300 bg-white/10 text-white placeholder-slate-400 resize-vertical min-h-[150px]"
                    placeholder="Please provide details about your issue"
                    required
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="flex-1 px-8 py-5 bg-white/5 border border-white/20 text-slate-300 hover:text-white hover:border-red-400/30 font-semibold rounded-2xl transition-all duration-300 text-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl transition-all duration-300 text-lg"
                  >
                    Create Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
