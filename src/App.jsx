import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/admin/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Brands from './pages/admin/Brands.jsx'
import Billing from './pages/admin/Billing.jsx'
import Orders from './pages/admin/Orders.jsx'
import PaymentVerification from './pages/admin/PaymentVerification.jsx'
import Coupons from './pages/admin/Coupons.jsx'
import Partners from './pages/admin/Partners.jsx'
import Settings from './pages/admin/Settings.jsx'
import Customers from './pages/admin/Customers.jsx'
import CustomerDetail from './pages/admin/CustomerDetail.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import StaffManagement from './pages/admin/StaffManagement.jsx'
import Sellers from './pages/admin/Sellers.jsx'
import Offers from './pages/admin/Offers.jsx'
import Categories from './pages/admin/Categories.jsx'
import SubCategories from './pages/admin/SubCategories.jsx'
import Home from './pages/user/Home.jsx'
import About from './pages/user/About.jsx'
import Catalogue from './pages/user/Catalogue.jsx'
import BrandPage from './pages/user/BrandPage.jsx'
import ProductDetail from './pages/user/ProductDetail.jsx'
import Enquiry from './pages/user/Enquiry.jsx'
import Partner from './pages/user/Partner.jsx'
import PartnerProtectedRoute from './components/PartnerProtectedRoute.jsx'
import UserLayout from './components/UserLayout.jsx'
import UserLogin from './pages/user/Login.jsx'
import UserSignup from './pages/user/Signup.jsx'
import ForgotPassword from './pages/user/ForgotPassword.jsx'
import ResetPassword from './pages/user/ResetPassword.jsx'
import OrderHistory from './pages/user/OrderHistory.jsx'
import Cart from './pages/user/Cart.jsx'
import Profile from './pages/user/Profile.jsx'
import ManualPayment from './pages/user/ManualPayment.jsx'
import PrivacyPolicy from './pages/user/PrivacyPolicy.jsx'
import TermsOfService from './pages/user/TermsOfService.jsx'
import Wishlist from './pages/user/Wishlist.jsx'
import OrderSuccess from './pages/user/OrderSuccess.jsx'
import BusinessLogin from './pages/business/Login.jsx'
import BusinessForgotPassword from './pages/business/ForgotPassword.jsx'
import BusinessResetPassword from './pages/business/ResetPassword.jsx'
import BusinessDashboard from './pages/business/Dashboard.jsx'
import BusinessRequest from './pages/business/Request.jsx'
import BusinessProducts from './pages/business/BusinessProductsPage.jsx'
import BusinessInventory from './pages/business/BusinessInventory.jsx'
import BusinessProfile from './pages/business/BusinessProfile.jsx'
import BusinessOrders from './pages/business/Orders.jsx'
import BusinessProtectedRoute from './components/BusinessProtectedRoute.jsx'
import BusinessLayout from './components/BusinessLayout.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="brands" element={<Brands />} />
        <Route path="categories" element={<Categories />} />
        <Route path="subcategories" element={<SubCategories />} />
        <Route path="billing" element={<Billing />} />
        <Route path="orders" element={<Orders />} />
        <Route path="payment-verification" element={<PaymentVerification />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="partners" element={<Partners />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="settings" element={<Settings />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="sellers" element={<Sellers />} />
        <Route path="offers" element={<Offers />} />
      </Route>

      <Route path="/business/login" element={<BusinessLogin />} />
      <Route path="/business/forgot-password" element={<BusinessForgotPassword />} />
      <Route path="/business/reset-password" element={<BusinessResetPassword />} />
      <Route path="/business/request" element={<BusinessRequest />} />
      <Route
        path="/business"
        element={
          <BusinessProtectedRoute>
            <BusinessLayout />
          </BusinessProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/business/dashboard" />} />
        <Route path="dashboard" element={<BusinessDashboard />} />
        <Route path="orders" element={<BusinessOrders />} />
        <Route path="products" element={<BusinessProducts />} />
        <Route path="inventory" element={<BusinessInventory />} />
        <Route path="profile" element={<BusinessProfile />} />
      </Route>

      <Route path="/" element={<UserLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="products" element={<Catalogue />} />
        <Route path="brand/:slug" element={<BrandPage />} />
        <Route path="products/:idOrSlug" element={<ProductDetail />} />
        <Route path="order" element={<Enquiry />} />
        <Route path="checkout" element={<Enquiry />} />
        <Route path="partner" element={<Partner />} />
        <Route path="partner/dashboard" element={
          <PartnerProtectedRoute>
            <Partner />
          </PartnerProtectedRoute>
        } />
        <Route path="login" element={<UserLogin />} />
        <Route path="signup" element={<UserSignup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="orders" element={<OrderHistory />} />
        <Route path="profile" element={<Profile />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="cart" element={<Cart />} />
        <Route path="manual-payment" element={<ManualPayment />} />
        <Route path="order-success" element={<OrderSuccess />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-of-service" element={<TermsOfService />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
