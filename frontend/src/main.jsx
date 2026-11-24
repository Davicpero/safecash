import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.jsx';
import { ErrorBoundary } from './components/Feedback.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster position="top-right" richColors closeButton duration={4000} />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
