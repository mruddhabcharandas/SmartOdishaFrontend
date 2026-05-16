import { Navigate, useLocation } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const location = useLocation()
  if (!token) return <Navigate to="/admin/login" replace />
  if (location.pathname.startsWith('/admin')) {
    try {
      const part = (token.split('.')[1] || '')
      const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
      const payload = JSON.parse(decodeURIComponent(atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')))
      
      if (payload?.role !== 'admin' && payload?.role !== 'staff') return <Navigate to="/admin/login" replace />
      
      // Permission check for staff
      if (payload?.role === 'staff') {
        const normalizedPath = location.pathname.replace(/\/$/, '') // remove trailing slash
        if (normalizedPath !== '/admin') {
          // Clean up the path to get the first segment after /admin/
          let path = normalizedPath;
          if (path.startsWith('/admin/')) path = path.substring(7);
          
          const perms = payload?.permissions || [];
          const segment = path.split('/')[0];
          
          // Staff must have the specific permission for the segment
          if (segment && !perms.includes(segment)) {
            return <Navigate to="/admin" replace />
          }
        }
      }
    } catch (e) {
      console.error('Token decode error:', e)
      // If we can't decode (non-standard token), don't block here; server will enforce role.
    }
  }
  return children
}
