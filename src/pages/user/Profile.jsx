import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';

export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Indian states for dropdown
  const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", 
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", 
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
  ];

  useEffect(() => {
    if (!token) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/api/user/me');
      setUserData(data);
      const kyc = data.kyc || {};
      setFormData({
        fullName: kyc.fullName || data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        addressLine1: kyc.addressLine1 || '',
        addressLine2: kyc.addressLine2 || '',
        city: kyc.city || '',
        state: kyc.state || '',
        pincode: kyc.pincode || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      notify('Please enter your full name', 'error');
      return false;
    }
    if (!formData.addressLine1.trim()) {
      notify('Please enter your address', 'error');
      return false;
    }
    if (!formData.city.trim()) {
      notify('Please enter your city', 'error');
      return false;
    }
    if (!formData.state.trim()) {
      notify('Please select your state', 'error');
      return false;
    }
    if (!/^[1-9][0-9]{5}$/.test(formData.pincode)) {
      notify('Please enter a valid 6-digit pincode', 'error');
      return false;
    }
    return true;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    try {
      await api.put('/api/user/kyc', formData);
      await refreshProfile();
      notify('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      notify(err?.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
      <LoadingSpinner text="Loading your profile..." />
    </div>
  );

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'activity', label: 'My Activity', icon: '📋' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            My Account
          </h1>
          <p className="text-gray-600">
            Welcome back, {user?.name || 'User'}!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden sticky top-8">
              <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{user?.name || 'User'}</p>
                    <p className="text-indigo-100 text-sm">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl mb-2 flex items-center gap-3 transition-all ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}

                <div className="border-t border-gray-200 my-4 pt-4">
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <span className="text-xl">🚪</span>
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Personal Information */}
            {activeTab === 'personal' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>👤</span> Personal Information
                  </h2>
                  <p className="text-gray-600 mt-1">Update your personal details</p>
                </div>

                <div className="p-6">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          disabled
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          Pincode <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                          placeholder="Enter 6-digit pincode"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          State <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                          placeholder="Enter your city"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                        Address Line 1 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                        placeholder="House number, street name, etc."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all"
                        placeholder="Landmark, area, etc."
                      />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* My Orders */}
            {activeTab === 'orders' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>📦</span> My Orders
                  </h2>
                </div>
                <div className="p-6">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    View All Orders →
                  </Link>
                </div>
              </div>
            )}

            {/* My Wishlist */}
            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>❤️</span> My Wishlist
                  </h2>
                </div>
                <div className="p-6">
                  <Link
                    to="/wishlist"
                    className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    View My Wishlist →
                  </Link>
                </div>
              </div>
            )}

            {/* My Activity */}
            {activeTab === 'activity' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>📋</span> My Activity
                  </h2>
                </div>
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📖</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Your activity will appear here</h3>
                  <p className="text-gray-600">Keep shopping to see your browsing history!</p>
                </div>
              </div>
            )}

            {/* Account Settings */}
            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <span>⚙️</span> Account Settings
                  </h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    <div className="p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-200 transition-all">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">Password</h3>
                      <p className="text-gray-600 mb-3">Change your password to keep your account secure</p>
                      <button className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                        Change Password →
                      </button>
                    </div>
                    <div className="p-4 border-2 border-gray-100 rounded-xl hover:border-indigo-200 transition-all">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">Notifications</h3>
                      <p className="text-gray-600 mb-3">Manage your email and SMS notifications</p>
                      <button className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors">
                        Notification Settings →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
