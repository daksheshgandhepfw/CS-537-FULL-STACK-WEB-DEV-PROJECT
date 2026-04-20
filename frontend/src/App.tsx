
import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { Layout } from '../components/Layout';
import { Dashboard } from '../pages/Dashboard';
import { Setup } from '../pages/Setup';
import { Interview } from '../pages/Interview';
import { Report } from '../pages/Report';
import { Login } from '../pages/Login';
import { Calendar } from '../pages/Calendar';

const App: React.FC = () => {
  const [route, setRoute] = useState(window.location.hash || '#/dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(!!db.getCurrentUser());

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleLogout = () => {
    db.logout();
    setIsLoggedIn(false);
  };

  const renderContent = () => {
    if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

    const path = route.split('/');
    const page = path[1];
    const id = path[2];

    switch (page) {
      case 'dashboard':
        return <Dashboard />;
      case 'setup':
        return <Setup />;
      case 'calendar':
        return <Calendar />;
      case 'interview':
        return id ? <Interview id={id} /> : <Dashboard />;
      case 'report':
        return id ? <Report id={id} /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  if (!isLoggedIn) return renderContent();

  return (
    <Layout onLogout={handleLogout}>
      {renderContent()}
    </Layout>
  );
};

export default App;
