import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/admin/Login.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Products from './pages/admin/Products.jsx'
import Brands from './pages/admin/Brands.jsx'
import Categories from './pages/admin/Categories.jsx'
import SubCategories from './pages/admin/SubCategories.jsx'
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
import InventoryPage from './pages/admin/InventoryPage.jsx'
import StaffManagement from './pages/admin/StaffManagement.jsx'
import Stores from './pages/admin/Stores.jsx'
import Offers from './pages/admin/Offers.jsx'
import Home from './pages/user/Home.jsx'
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
        <Route path="products" element={<Products />} />
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
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="staff" element={<StaffManagement />} />
        <Route path="stores" element={<Stores />} />
        <Route path="offers" element={<Offers />} />
      </Route>

      <Route path="/" element={<UserLayout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Catalogue />} />
        <Route path="brand/:slug" element={<BrandPage />} />
        <Route path="products/:idOrSlug" element={<ProductDetail />} />
        <Route path="order" element={<Enquiry />} />
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
        <Route path="cart" element={<Cart />} />
        <Route path="manual-payment" element={<ManualPayment />} />
        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-of-service" element={<TermsOfService />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
