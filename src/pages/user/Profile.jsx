
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
    name: ''
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

  useEffect(() =&gt; {
    if (!token) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    loadProfile();
    loadAddresses();
  }, [token]);

  const loadProfile = async () =&gt; {
    try {
      const { data } = await api.get('/api/user/me');
      setFormData({
        name: data.name || ''
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () =&gt; {
    try {
      const { data } = await api.get('/api/user/addresses');
      setSavedAddresses(data);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  };

  const handleInputChange = (e) =&gt; {
    const { name, value } = e.target;
    setFormData(prev =&gt; ({ ...prev, [name]: value }));
  };

  const handleAddressInputChange = (e) =&gt; {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev =&gt; ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async (e) =&gt; {
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

  const handleAddAddress = () =&gt; {
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
      isDefault: false
    });
    setShowAddressModal(true);
  };

  const handleEditAddress = (address) =&gt; {
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

  const handleSaveAddress = async (e) =&gt; {
    e.preventDefault();
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

  const handleDeleteAddress = async (addressId) =&gt; {
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

  const handleSetDefault = async (addressId) =&gt; {
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

  if (loading) {
    return (
      &lt;div className="min-h-screen flex items-center justify-center bg-slate-50"&gt;
        &lt;LoadingSpinner text="Loading your profile..." /&gt;
      &lt;/div&gt;
    );
  }

  const menuItems = [
    { id: 'personal', label: 'Personal Information', icon: '👤' },
    { id: 'addresses', label: 'Saved Addresses', icon: '🏠' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
    { id: 'wishlist', label: 'My Wishlist', icon: '❤️' },
    { id: 'activity', label: 'My Activity', icon: '📋' },
    { id: 'settings', label: 'Account Settings', icon: '⚙️' },
  ];

  return (
    &lt;div className="min-h-screen bg-slate-50 py-8 px-4"&gt;
      &lt;div className="max-w-7xl mx-auto"&gt;
        &lt;div className="mb-8"&gt;
          &lt;h1 className="text-3xl font-bold text-slate-900 mb-2"&gt;My Account&lt;/h1&gt;
          &lt;p className="text-slate-500"&gt;Manage your profile, orders, and preferences&lt;/p&gt;
        &lt;/div&gt;

        &lt;div className="grid grid-cols-1 lg:grid-cols-4 gap-6"&gt;
          &lt;div className="lg:col-span-1"&gt;
            &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-8"&gt;
              &lt;div className="p-6 border-b border-slate-100"&gt;
                &lt;div className="flex items-center gap-4"&gt;
                  &lt;div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg overflow-hidden"&gt;
                    {user?.avatar ? (
                      &lt;img src={getCloudinaryUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" /&gt;
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  &lt;/div&gt;
                  &lt;div className="flex-1"&gt;
                    &lt;p className="font-semibold text-slate-900 leading-tight"&gt;{user?.name || 'User'}&lt;/p&gt;
                    &lt;p className="text-slate-500 text-sm truncate"&gt;{user?.email}&lt;/p&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              
              &lt;nav className="p-3"&gt;
                {menuItems.map((item) =&gt; (
                  &lt;button
                    key={item.id}
                    onClick={() =&gt; setActiveTab(item.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl mb-1 flex items-center gap-3 transition-all ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  &gt;
                    &lt;span className="text-xl"&gt;{item.icon}&lt;/span&gt;
                    &lt;span className="text-sm font-medium"&gt;{item.label}&lt;/span&gt;
                  &lt;/button&gt;
                ))}

                &lt;div className="border-t border-slate-100 my-3 pt-3"&gt;
                  &lt;button
                    onClick={() =&gt; {
                      localStorage.removeItem('token');
                      localStorage.removeItem('user');
                      navigate('/');
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-red-600 hover:bg-red-50 transition-all"
                  &gt;
                    &lt;span className="text-xl"&gt;🚪&lt;/span&gt;
                    &lt;span className="text-sm font-medium"&gt;Logout&lt;/span&gt;
                  &lt;/button&gt;
                &lt;/div&gt;
              &lt;/nav&gt;
            &lt;/div&gt;
          &lt;/div&gt;

          &lt;div className="lg:col-span-3 space-y-6"&gt;
            {activeTab === 'personal' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100"&gt;
                  &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                  &lt;span className="text-2xl"&gt;👤&lt;/span&gt; Personal Information
                  &lt;/h2&gt;
                  &lt;p className="text-slate-500 text-sm mt-1"&gt;Update your personal details here&lt;/p&gt;
                &lt;/div&gt;
                &lt;div className="p-6"&gt;
                  &lt;form onSubmit={handleSaveProfile} className="space-y-6"&gt;
                    &lt;div className="grid grid-cols-1 md:grid-cols-2 gap-5"&gt;
                      &lt;div className="space-y-2"&gt;
                        &lt;label className="text-sm font-medium text-slate-700"&gt;
                          Full Name &lt;span className="text-red-500"&gt;*&lt;/span&gt;
                        &lt;/label&gt;
                        &lt;input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all bg-white"
                          placeholder="Enter your full name"
                        /&gt;
                      &lt;/div&gt;
                      &lt;div className="space-y-2"&gt;
                        &lt;label className="text-sm font-medium text-slate-700"&gt;Email Address&lt;/label&gt;
                        &lt;input
                          type="email"
                          name="email"
                          value={user?.email || ''}
                          disabled
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                        /&gt;
                      &lt;/div&gt;
                      &lt;div className="space-y-2"&gt;
                        &lt;label className="text-sm font-medium text-slate-700"&gt;Phone Number&lt;/label&gt;
                        &lt;input
                          type="tel"
                          name="phone"
                          value={user?.phone || ''}
                          disabled
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                        /&gt;
                      &lt;/div&gt;
                    &lt;/div&gt;

                    &lt;div className="pt-6 flex justify-end"&gt;
                      &lt;button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      &gt;
                        {saving ? (
                          &lt;span className="flex items-center gap-2"&gt;
                          &lt;div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"&gt;&lt;/div&gt;
                          Saving...
                          &lt;/span&gt;
                        ) : (
                          'Save Changes'
                        )}
                      &lt;/button&gt;
                    &lt;/div&gt;
                  &lt;/form&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'addresses' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100 flex items-center justify-between"&gt;
                  &lt;div&gt;
                    &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                      &lt;span className="text-2xl"&gt;🏠&lt;/span&gt; Saved Addresses
                    &lt;/h2&gt;
                    &lt;p className="text-slate-500 text-sm mt-1"&gt;Manage your delivery addresses&lt;/p&gt;
                  &lt;/div&gt;
                  &lt;button
                    onClick={handleAddAddress}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                  &gt;
                    &lt;span&gt;+&lt;/span&gt; Add Address
                  &lt;/button&gt;
                &lt;/div&gt;
                &lt;div className="p-6"&gt;
                  {savedAddresses.length === 0 ? (
                    &lt;div className="text-center py-12"&gt;
                      &lt;div className="text-6xl mb-4 text-slate-300"&gt;📍&lt;/div&gt;
                      &lt;h3 className="text-lg font-semibold text-slate-900 mb-2"&gt;No saved addresses yet&lt;/h3&gt;
                      &lt;p className="text-slate-500 mb-6"&gt;Add your first address to get started with faster checkout&lt;/p&gt;
                      &lt;button
                        onClick={handleAddAddress}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
                      &gt;
                        Add Your First Address
                      &lt;/button&gt;
                    &lt;/div&gt;
                  ) : (
                    &lt;div className="space-y-4"&gt;
                      {savedAddresses.map((address) =&gt; (
                        &lt;div key={address._id} className={`p-5 border rounded-xl transition-all ${address.isDefault ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}&gt;
                          &lt;div className="flex items-start justify-between mb-3"&gt;
                            &lt;div&gt;
                              &lt;div className="flex items-center gap-2 mb-1"&gt;
                                &lt;h4 className="font-semibold text-slate-900"&gt;{address.fullName}&lt;/h4&gt;
                                {address.isDefault &amp;&amp; (
                                  &lt;span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full"&gt;Default&lt;/span&gt;
                                )}
                              &lt;/div&gt;
                              &lt;p className="text-slate-600 text-sm"&gt;{address.phone}&lt;/p&gt;
                            &lt;/div&gt;
                            &lt;div className="flex gap-2"&gt;
                              &lt;button
                                onClick={() =&gt; handleEditAddress(address)}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
                                title="Edit"
                              &gt;
                                ✏️
                              &lt;/button&gt;
                              &lt;button
                                onClick={() =&gt; handleDeleteAddress(address._id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                                title="Delete"
                              &gt;
                                🗑️
                              &lt;/button&gt;
                            &lt;/div&gt;
                          &lt;/div&gt;
                          &lt;div className="text-slate-700 mb-3"&gt;
                            &lt;p&gt;{address.addressLine1}&lt;/p&gt;
                            {address.addressLine2 &amp;&amp; &lt;p&gt;{address.addressLine2}&lt;/p&gt;}
                            &lt;p&gt;{address.city}, {address.district}, {address.state} - {address.pincode}&lt;/p&gt;
                          &lt;/div&gt;
                          {!address.isDefault &amp;&amp; (
                            &lt;button
                              onClick={() =&gt; handleSetDefault(address._id)}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            &gt;
                              Set as Default
                            &lt;/button&gt;
                          )}
                        &lt;/div&gt;
                      ))}
                    &lt;/div&gt;
                  )}
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'orders' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100"&gt;
                  &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                    &lt;span className="text-2xl"&gt;📦&lt;/span&gt; My Orders
                  &lt;/h2&gt;
                &lt;/div&gt;
                &lt;div className="p-6"&gt;
                  &lt;Link
                    to="/orders"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
                  &gt;
                    View All Orders →
                  &lt;/Link&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'wishlist' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100"&gt;
                  &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                    &lt;span className="text-2xl"&gt;❤️&lt;/span&gt; My Wishlist
                  &lt;/h2&gt;
                &lt;/div&gt;
                &lt;div className="p-6"&gt;
                  &lt;Link
                    to="/wishlist"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm hover:shadow transition-all"
                  &gt;
                    View My Wishlist →
                  &lt;/Link&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'activity' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100"&gt;
                  &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                    &lt;span className="text-2xl"&gt;📋&lt;/span&gt; My Activity
                  &lt;/h2&gt;
                &lt;/div&gt;
                &lt;div className="p-8 text-center"&gt;
                  &lt;div className="text-6xl mb-4 text-slate-300"&gt;📖&lt;/div&gt;
                  &lt;h3 className="text-lg font-semibold text-slate-900 mb-2"&gt;Your activity will appear here&lt;/h3&gt;
                  &lt;p className="text-slate-500"&gt;Keep shopping to see your browsing history!&lt;/p&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}

            {activeTab === 'settings' &amp;&amp; (
              &lt;div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"&gt;
                &lt;div className="p-6 border-b border-slate-100"&gt;
                  &lt;h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"&gt;
                    &lt;span className="text-2xl"&gt;⚙️&lt;/span&gt; Account Settings
                  &lt;/h2&gt;
                &lt;/div&gt;
                &lt;div className="p-6"&gt;
                  &lt;div className="space-y-4"&gt;
                    &lt;div className="p-5 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all"&gt;
                      &lt;h3 className="font-semibold text-slate-900 mb-1"&gt;Password&lt;/h3&gt;
                      &lt;p className="text-slate-500 text-sm mb-3"&gt;Change your password to keep your account secure&lt;/p&gt;
                      &lt;button className="text-blue-700 font-medium text-sm hover:text-blue-800"&gt;
                        Change Password →
                      &lt;/button&gt;
                    &lt;/div&gt;
                    &lt;div className="p-5 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all"&gt;
                      &lt;h3 className="font-semibold text-slate-900 mb-1"&gt;Notifications&lt;/h3&gt;
                      &lt;p className="text-slate-500 text-sm mb-3"&gt;Manage your email and SMS notifications&lt;/p&gt;
                      &lt;button className="text-blue-700 font-medium text-sm hover:text-blue-800"&gt;
                        Notification Settings →
                      &lt;/button&gt;
                    &lt;/div&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
              &lt;/div&gt;
            )}
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      {showAddressModal &amp;&amp; (
        &lt;div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"&gt;
          &lt;div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"&gt;
            &lt;div className="p-6 border-b border-slate-100"&gt;
              &lt;h2 className="text-xl font-bold text-slate-900"&gt;
                {editingAddress ? 'Edit Address' : 'Add New Address'}
              &lt;/h2&gt;
            &lt;/div&gt;
            &lt;form onSubmit={handleSaveAddress} className="p-6 space-y-4"&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;Full Name *&lt;/label&gt;
                &lt;input
                  type="text"
                  name="fullName"
                  value={addressForm.fullName}
                  onChange={handleAddressInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                /&gt;
              &lt;/div&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;Phone Number *&lt;/label&gt;
                &lt;input
                  type="tel"
                  name="phone"
                  value={addressForm.phone}
                  onChange={handleAddressInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                /&gt;
              &lt;/div&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;Address Line 1 *&lt;/label&gt;
                &lt;input
                  type="text"
                  name="addressLine1"
                  value={addressForm.addressLine1}
                  onChange={handleAddressInputChange}
                  required
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                /&gt;
              &lt;/div&gt;
              &lt;div&gt;
                &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;Address Line 2&lt;/label&gt;
                &lt;input
                  type="text"
                  name="addressLine2"
                  value={addressForm.addressLine2}
                  onChange={handleAddressInputChange}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                /&gt;
              &lt;/div&gt;
              &lt;div className="grid grid-cols-2 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;City *&lt;/label&gt;
                  &lt;input
                    type="text"
                    name="city"
                    value={addressForm.city}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;District *&lt;/label&gt;
                  &lt;input
                    type="text"
                    name="district"
                    value={addressForm.district}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;div className="grid grid-cols-2 gap-4"&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;State *&lt;/label&gt;
                  &lt;input
                    type="text"
                    name="state"
                    value={addressForm.state}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  /&gt;
                &lt;/div&gt;
                &lt;div&gt;
                  &lt;label className="block text-sm font-medium text-slate-700 mb-1"&gt;Pincode *&lt;/label&gt;
                  &lt;input
                    type="text"
                    name="pincode"
                    value={addressForm.pincode}
                    onChange={handleAddressInputChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  /&gt;
                &lt;/div&gt;
              &lt;/div&gt;
              &lt;div className="flex items-center gap-2"&gt;
                &lt;input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={addressForm.isDefault}
                  onChange={handleAddressInputChange}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                /&gt;
                &lt;label htmlFor="isDefault" className="text-sm font-medium text-slate-700"&gt;
                  Set as default address
                &lt;/label&gt;
              &lt;/div&gt;
              &lt;div className="flex gap-3 pt-4"&gt;
                &lt;button
                  type="button"
                  onClick={() =&gt; setShowAddressModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all"
                &gt;
                  Cancel
                &lt;/button&gt;
                &lt;button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all"
                &gt;
                  Save Address
                &lt;/button&gt;
              &lt;/div&gt;
            &lt;/form&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      )}
    &lt;/div&gt;
  );
}

