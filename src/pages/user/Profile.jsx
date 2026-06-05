
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
      
      setAddressForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : processedValue
      }));
    }
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

  const menuItems = [
    { id: 'dashboard', label: 'My Account', icon: '👤' },
    { id: 'personal', label: 'Personal Information', icon: '📝' },
    { id: 'addresses', label: 'Addresses', icon: '🏠' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'support', label: 'Help & Support', icon: '🎫' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'logout', label: 'Logout', icon: '🚪' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Flipkart-style header */}
      <div className="bg-blue-600 text-white py-4 px-4 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/')} className="text-white hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-bold">My Account</h1>
            </div>
            <div className="flex items-center gap-3">
              {user?.avatar ? (
                <img src={getCloudinaryUrl(user.avatar)} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="hidden sm:block">
                <div className="font-semibold">{user?.name || 'User'}</div>
                <div className="text-xs text-blue-200">{user?.email}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar Menu - Flipkart style */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'logout') {
                      handleLogout();
                    } else {
                      setActiveTab(item.id);
                    }
                  }}
                  className={`w-full px-5 py-4 text-left flex items-center gap-4 border-b border-gray-100 last:border-0 transition-colors ${
                    activeTab === item.id 
                      ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Hello, {user?.name?.split(' ')[0] || 'User'}!</h2>
                    <p className="text-gray-600">Manage your orders, profile and preferences here.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link to="/orders" className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                      <div className="text-3xl mb-2">📦</div>
                      <div className="font-semibold text-gray-900">My Orders</div>
                      <div className="text-sm text-gray-500 mt-1">Track, cancel or return orders</div>
                    </Link>
                    <button onClick={() => setActiveTab('addresses')} className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left w-full">
                      <div className="text-3xl mb-2">🏠</div>
                      <div className="font-semibold text-gray-900">Addresses</div>
                      <div className="text-sm text-gray-500 mt-1">Save and manage delivery addresses</div>
                    </button>
                    <button onClick={() => setActiveTab('personal')} className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left w-full">
                      <div className="text-3xl mb-2">📝</div>
                      <div className="font-semibold text-gray-900">Profile</div>
                      <div className="text-sm text-gray-500 mt-1">Edit your profile details</div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'personal' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Personal Information</h2>
                  <form onSubmit={handleSaveProfile} className="space-y-6 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'addresses' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Saved Addresses</h2>
                    <button
                      onClick={handleAddAddress}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Add Address
                    </button>
                  </div>
                  
                  {savedAddresses.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🏠</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved addresses yet</h3>
                      <p className="text-gray-500 mb-6">Add your first address to get started with faster checkout</p>
                      <button
                        onClick={handleAddAddress}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Add Your First Address
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {savedAddresses.map((address) => (
                        <div key={address._id} className="p-5 border border-gray-200 rounded-lg hover:border-blue-300">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-bold text-gray-900">{address.fullName}</div>
                                <span className="text-gray-500">•</span>
                                <div className="text-gray-700">{address.phone}</div>
                                {address.isDefault && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">Default</span>
                                )}
                              </div>
                              <div className="text-gray-600 space-y-1">
                                <div>{address.addressLine1}</div>
                                {address.addressLine2 && <div>{address.addressLine2}</div>}
                                <div>{address.city}, {address.district}, {address.state} - {address.pincode}</div>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleEditAddress(address)}
                                className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded text-sm font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAddress(address._id)}
                                className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded text-sm font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {!address.isDefault && (
                            <button
                              onClick={() => handleSetDefault(address._id)}
                              className="mt-4 text-blue-600 text-sm font-medium hover:underline"
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

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">My Orders</h2>
                  <Link to="/orders" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                    View All Orders
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">My Wishlist</h2>
                  <Link to="/wishlist" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                    View My Wishlist
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              )}

              {activeTab === 'support' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
                    <button
                      onClick={() => setShowNewTicketModal(true)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Raise a Ticket
                    </button>
                  </div>
                  
                  {ticketsLoading ? (
                    <div className="text-center py-8">
                      <LoadingSpinner text="Loading tickets..." />
                    </div>
                  ) : tickets.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🎫</div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No support tickets yet</h3>
                      <p className="text-gray-500 mb-6">Create a ticket if you need help with anything</p>
                      <button
                        onClick={() => setShowNewTicketModal(true)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Create Ticket
                      </button>
                    </div>
                  ) : selectedTicket ? (
                    <div className="space-y-4">
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to all tickets
                      </button>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-5 border-b border-gray-200 bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                              <div className="text-sm text-gray-500 mt-1">
                                Category: {selectedTicket.category} • Status: {selectedTicket.status}
                              </div>
                            </div>
                            {selectedTicket.status !== 'Resolved' && (
                              <button
                                onClick={() => handleResolveTicket(selectedTicket._id)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                              >
                                Mark as Resolved
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-5 max-h-96 overflow-y-auto space-y-4">
                          {selectedTicket.messages && selectedTicket.messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] p-4 rounded-lg ${msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                                <p>{msg.message}</p>
                                <p className={`text-xs mt-2 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                  {new Date(msg.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-5 border-t border-gray-200">
                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={messageInput}
                              onChange={(e) => setMessageInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddMessage(selectedTicket._id)}
                              placeholder="Type your message..."
                              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <button
                              onClick={() => handleAddMessage(selectedTicket._id)}
                              disabled={!messageInput.trim()}
                              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
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
                          className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-semibold text-gray-900">{ticket.subject}</div>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              ticket.status === 'Open' ? 'bg-yellow-100 text-yellow-700' : 
                              ticket.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                          <p className="text-xs text-gray-400">Updated: {new Date(ticket.updatedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Settings</h2>
                  <div className="space-y-4 max-w-lg">
                    {!showPasswordChange ? (
                      <button
                        onClick={() => setShowPasswordChange(true)}
                        className="w-full p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left flex items-center gap-4"
                      >
                        <span className="text-2xl">🔒</span>
                        <div>
                          <div className="font-semibold text-gray-900">Change Password</div>
                          <div className="text-sm text-gray-500 mt-1">Update your account password</div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-6">
                        <button
                          onClick={() => {
                            setShowPasswordChange(false);
                            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                          }}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-6"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                          Back
                        </button>
                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                            <input
                              type="password"
                              name="currentPassword"
                              value={passwordForm.currentPassword}
                              onChange={handlePasswordChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter current password"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                              type="password"
                              name="newPassword"
                              value={passwordForm.newPassword}
                              onChange={handlePasswordChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter new password (min 6 chars)"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <input
                              type="password"
                              name="confirmPassword"
                              value={passwordForm.confirmPassword}
                              onChange={handlePasswordChange}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Confirm new password"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            {changingPassword ? 'Changing Password...' : 'Change Password'}
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
      </div>

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={addressForm.fullName}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={addressForm.phone}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10-digit phone number"
                    required
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={addressForm.addressLine1}
                  onChange={handleAddressInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="House number, street, etc."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                <input
                  type="text"
                  name="addressLine2"
                  value={addressForm.addressLine2}
                  onChange={handleAddressInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Landmark, area, etc. (optional)"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={addressForm.pincode}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="6-digit pincode"
                    required
                    maxLength={6}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
                  <input
                    type="text"
                    name="district"
                    value={addressForm.district}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="District"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                  <select
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((state) => (
                      <option key={state} value={state}>{state}</option>
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
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as default address</label>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create Support Ticket</h2>
              <button onClick={() => setShowNewTicketModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                <input
                  type="text"
                  value={newTicketForm.subject}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newTicketForm.category}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Order Issue">Order Issue</option>
                  <option value="Payment Issue">Payment Issue</option>
                  <option value="Product Query">Product Query</option>
                  <option value="Return/Refund">Return/Refund</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={newTicketForm.description}
                  onChange={(e) => setNewTicketForm({ ...newTicketForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[150px]"
                  placeholder="Please provide details about your issue"
                  required
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Create Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
