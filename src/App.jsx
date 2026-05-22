import React from 'react';
import { useApp } from './context/AppContext.jsx';
import Login from './components/Login.jsx';
import ProjectDashboard from './components/ProjectDashboard.jsx';
import WorkspaceLayout from './components/WorkspaceLayout.jsx';

export default function App() {
  const { user, authLoading, currentProject } = useApp();

  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="loading-mark">M</div>
      </div>
    );
  }

  if (!user) return <Login />;
  if (!currentProject) return <ProjectDashboard />;
  return <WorkspaceLayout />;
}
