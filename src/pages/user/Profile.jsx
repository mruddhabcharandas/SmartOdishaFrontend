
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { useAuth } from '../../lib/AuthContext';
import { useToast } from '../../components/Toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getCloudinaryUrl } from '../../lib/cloudinary';

export default function Profile() {
  const { user, token, refreshProfile } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', avatar: '' });

  useEffect(() => {
    if (!token) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    loadProfile();
  }, [token]);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/api/user/me');
      setFormData({
        name: data.name || '',
        address: data.address || '',
        avatar: data.avatar || '',
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/api/upload/image', formData);
        setFormData(prev => ({ ...prev, avatar: data.url || '' }));
        notify('Avatar uploaded!', 'success');
      } catch {
        notify('Failed to upload avatar', 'error');
      }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Loading your profile..." />
      </div>
    );
  }

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'activity', label: 'My Activity', icon: '📋' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">My Account</h1>
          <p className="text-slate-500">Manage your profile, orders, and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-8">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg overflow-hidden">
                    {user?.avatar ? (
                      <img src={getCloudinaryUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 leading-tight">{user?.name || 'User'}</p>
                    <p className="text-slate-500 text-sm truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-3">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                ))}

                <div className="border-t border-slate-100 my-3 pt-3">
                  <button
                    onClick={() => {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-all"
                  >
                    <span className="text-xl">🚪</span>
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </div>
              </nav>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {activeTab === 'personal' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-2xl">👤</span> Personal Information
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Update your personal details here</p>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="flex items-center gap-6 mb-4">
                      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-3xl text-white overflow-hidden">
                        {formData.avatar ? (
                          <img src={getCloudinaryUrl(formData.avatar)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          user?.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <label className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold uppercase tracking-wide rounded-xl cursor-pointer transition-all hover:bg-blue-100">
                          Change Avatar
                          <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </label>
                        <p className="text-slate-400 text-xs mt-2">JPG, PNG up to 5MB</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email || user?.email || ''}
                          disabled
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Phone Number</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone || user?.phone || ''}
                          disabled
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Delivery Address <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white resize-none"
                        placeholder="Enter your complete delivery address"
                      />
                    </div>

                    <div className="pt-6 flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">📦</span> My Orders
                  </h2>
                </div>
                <div className="p-6">
                  <Link
                    to="/orders"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
                  >
                    View All Orders →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'wishlist' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">❤️</span> My Wishlist
                  </h2>
                </div>
                <div className="p-6">
                  <Link
                    to="/wishlist"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
                  >
                    View My Wishlist →
                  </Link>
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">📋</span> My Activity
                  </h2>
                </div>
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4 text-slate-300">📖</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Your activity will appear here</h3>
                  <p className="text-slate-500">Keep shopping to see your browsing history!</p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-2xl">⚙️</span> Account Settings
                  </h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="p-5 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all">
                      <h3 className="font-semibold text-slate-900 mb-1">Password</h3>
                      <p className="text-slate-500 text-sm mb-3">Change your password to keep your account secure</p>
                      <button className="text-blue-700 font-medium text-sm hover:text-blue-800">
                        Change Password →
                      </button>
                    </div>
                    <div className="p-5 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all">
                      <h3 className="font-semibold text-slate-900 mb-1">Notifications</h3>
                      <p className="text-slate-500 text-sm mb-3">Manage your email and SMS notifications</p>
                      <button className="text-blue-700 font-medium text-sm hover:text-blue-800">
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

