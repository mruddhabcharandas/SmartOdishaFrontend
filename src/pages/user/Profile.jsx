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
  const [locLoading, setLocLoading] = useState(false);
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

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      notify('Geolocation is not supported by your browser', 'error');
      return;
    }

    setLocLoading(true);
    
    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=en`
            );
            const data = await response.json();
            
            if (data.address) {
              const addr = data.address;
              setFormData({
                ...formData,
                city: addr.city || addr.town || addr.village || addr.district || formData.city,
                state: addr.state || formData.state,
                addressLine1: [addr.road, addr.neighbourhood].filter(Boolean).join(', ') || data.display_name.split(',').slice(0, 2).join(', ') || formData.addressLine1,
                addressLine2: [addr.county, addr.state_district].filter(Boolean).join(', ') || data.display_name.split(',').slice(2, 4).join(', ') || formData.addressLine2,
              });
              notify('Address details detected! Please fill your pincode manually.', 'success');
            }
          } catch (err) {
            console.error('Failed to fetch address:', err);
            notify('Failed to detect address', 'error');
          } finally {
            setLocLoading(false);
          }
        },
        () => {
          setLocLoading(false);
          notify('Location access denied. Please enable GPS.', 'error');
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch (err) {
      setLocLoading(false);
      notify('Failed to detect location', 'error');
    }
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">
            <span className="text-blue-700">MY</span>
            <span className="text-orange-500"> ACCOUNT</span>
          </h1>
          <p className="text-gray-600 font-semibold">
            Welcome back, {user?.name || 'User'}! Manage your account details here.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden sticky top-8 border border-gray-100">
              <div className="p-6 bg-gradient-to-br from-blue-700 to-blue-600 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold shadow-lg">
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{user?.name || 'User'}</p>
                    <p className="text-white/80 text-sm">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-4">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-4 rounded-2xl mb-2 flex items-center gap-3 transition-all duration-300 ${
                      activeTab === item.id
                        ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white shadow-xl shadow-blue-200'
                        : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-bold">{item.label}</span>
                  </button>
                ))}

                <div className="border-t border-gray-100 my-4 pt-4">
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-4 rounded-2xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <span className="text-xl">🚪</span>
                    <span className="font-bold">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'personal' && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-blue-50">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <span>👤</span> Personal Information
                      </h2>
                      <p className="text-gray-600 mt-1 font-semibold">Update your personal details here</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={detectLocation}
                      disabled={locLoading}
                      className="group relative overflow-hidden flex items-center gap-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {locLoading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          '📍'
                        )}
                        Auto Fill Address
                      </span>
                    </button>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleSaveProfile} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          Full Name <span className="text-orange-500 text-lg">*</span>
                        </label>
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          disabled
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-gray-100 text-gray-500 cursor-not-allowed font-semibold"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          disabled
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-gray-100 text-gray-500 cursor-not-allowed font-semibold"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          Pincode <span className="text-orange-500 text-lg">*</span>
                        </label>
                        <input
                          type="text"
                          name="pincode"
                          value={formData.pincode}
                          onChange={handleInputChange}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                          placeholder="Enter 6-digit pincode"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          State <span className="text-orange-500 text-lg">*</span>
                        </label>
                        <select
                          name="state"
                          value={formData.state}
                          onChange={handleInputChange}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                        >
                          <option value="">Select State</option>
                          {INDIAN_STATES.map((state) => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-3">
                        <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                          City <span className="text-orange-500 text-lg">*</span>
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                          placeholder="Enter your city"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-black text-gray-800 flex items-center gap-2">
                        Address Line 1 <span className="text-orange-500 text-lg">*</span>
                      </label>
                      <input
                        type="text"
                        name="addressLine1"
                        value={formData.addressLine1}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                        placeholder="House number, street name, etc."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-black text-gray-800">
                        Address Line 2 (Optional)
                      </label>
                      <input
                        type="text"
                        name="addressLine2"
                        value={formData.addressLine2}
                        onChange={handleInputChange}
                        className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300 bg-gray-50/50 text-gray-800 font-semibold"
                        placeholder="Landmark, area, etc."
                      />
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-orange-200 hover:shadow-orange-300 transform hover:-translate-y-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Saving...
                          </span>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <span>📦</span> My Orders
                  </h2>
                </div>
                <div className="p-8">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black text-lg rounded-2xl hover:shadow-xl transform hover:-translate-y-2 transition-all"
                  >
                    View All Orders →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <span>❤️</span> My Wishlist
                  </h2>
                </div>
                <div className="p-8">
                  <Link
                    to="/wishlist"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-700 to-blue-600 text-white font-black text-lg rounded-2xl hover:shadow-xl transform hover:-translate-y-2 transition-all"
                  >
                    View My Wishlist →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <span>📋</span> My Activity
                  </h2>
                </div>
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📖</div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Your activity will appear here</h3>
                  <p className="text-gray-600 font-semibold">Keep shopping to see your browsing history!</p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-white to-blue-50">
                  <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                    <span>⚙️</span> Account Settings
                  </h2>
                </div>
                <div className="p-8">
                  <div className="space-y-4">
                    <div className="p-6 border-2 border-gray-100 rounded-2xl hover:border-blue-200 transition-all">
                      <h3 className="font-black text-xl text-gray-900 mb-2">Password</h3>
                      <p className="text-gray-600 mb-4 font-semibold">Change your password to keep your account secure</p>
                      <button className="text-blue-700 font-black hover:text-blue-800 transition-colors">
                        Change Password →
                      </button>
                    </div>
                    <div className="p-6 border-2 border-gray-100 rounded-2xl hover:border-blue-200 transition-all">
                      <h3 className="font-black text-xl text-gray-900 mb-2">Notifications</h3>
                      <p className="text-gray-600 mb-4 font-semibold">Manage your email and SMS notifications</p>
                      <button className="text-blue-700 font-black hover:text-blue-800 transition-colors">
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
