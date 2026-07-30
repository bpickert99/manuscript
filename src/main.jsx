import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import ReviewView from './components/ReviewView.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppProvider } from './context/AppContext.jsx';
import './index.css';

function reviewTokenFromHash(hash) {
  return hash.startsWith('#/review/') ? hash.slice('#/review/'.length).split(/[?#]/)[0] : null;
}

function Root() {
  const [token, setToken] = useState(() => reviewTokenFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setToken(reviewTokenFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (token) return <ReviewView token={token} />;

  return (
    <ThemeProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
