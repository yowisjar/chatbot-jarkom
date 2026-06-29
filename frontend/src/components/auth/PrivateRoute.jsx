import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.9rem',
      }}>
        Memuat...
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
}
