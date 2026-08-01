import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import ManuscriptSidebar from './ManuscriptSidebar';
import TopNav from './TopNav';
import Editor from './Editor';
import NotesPanel from './NotesPanel';
import LayoutView from './LayoutView';
import PlotGrid from './PlotGrid';
import MapView from './MapView';
import WikiView from './WikiView';

export default function WorkspaceLayout() {
  const { activeTab, setActiveTab } = useApp();
  const [notesOpen, setNotesOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const notesVisible = notesOpen && activeTab === 'write';

  return (
    <div className="workspace">
      {/* Mobile backdrop */}
      <div
        className={"sidebar-backdrop" + (mobileSidebarOpen ? " visible" : "")}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <ManuscriptSidebar
        mobile={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="workspace-main">
        <TopNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notesOpen={notesOpen}
          setNotesOpen={setNotesOpen}
          onMobileMenuOpen={() => setMobileSidebarOpen(true)}
        />
        <div className="workspace-content">
          <div className="workspace-panel">
            {activeTab === 'write' && <Editor />}
            {activeTab === 'layout' && <LayoutView />}
            {activeTab === 'plot' && <PlotGrid />}
            {activeTab === 'map' && <MapView />}
            {activeTab === 'wiki' && <WikiView />}
          </div>
          <div className={"notes-panel-wrap" + (notesVisible ? " open" : "")}>
            {notesVisible && <NotesPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
