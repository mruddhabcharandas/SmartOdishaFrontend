import React, { useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { useCart } from '../../lib/CartContext'

export default function OrderSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { clearCart } = useCart()
  const { isAuthenticated } = useAuth()
  
  useEffect(() => {
    if (!state?.orderId) {
      navigate('/')
    } else {
      clearCart()
    }
  }, [state?.orderId, navigate, clearCart])
  
  if (!state?.orderId) return null
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="flex flex-col items-center text-center">
          {/* Green Checkmark */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg 
              className="w-10 h-10 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Order Placed Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you for your order! We are processing it now.
          </p>
          
          {/* Order ID */}
          <div className="bg-gray-50 rounded-lg p-4 w-full mb-6">
            <p className="text-sm text-gray-500 mb-1">Order ID</p>
            <p className="text-lg font-semibold text-gray-900">
              {state.orderNumber || state.orderId}
            </p>
          </div>
          
          {/* Total Amount */}
          <div className="bg-blue-50 rounded-lg p-4 w-full mb-6">
            <p className="text-sm text-blue-600 mb-1">Total Amount</p>
            <p className="text-2xl font-bold text-blue-700">
              ₹{Number(state.totalAmount || 0).toLocaleString('en-IN')}
            </p>
          </div>
          
          {/* Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <Link 
              to="/orders" 
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View My Orders
            </Link>
            <Link 
              to="/" 
              className="w-full bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
