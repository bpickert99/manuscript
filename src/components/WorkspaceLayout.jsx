import React, { useState } from 'react';
import ManuscriptSidebar from './ManuscriptSidebar';
import TopNav from './TopNav';
import Editor from './Editor';
import NotesPanel from './NotesPanel';
import PlotGrid from './PlotGrid';
import MapView from './MapView';
import WikiView from './WikiView';

export default function WorkspaceLayout() {
  const [activeTab, setActiveTab] = useState('write');
  const [notesOpen, setNotesOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
          <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {activeTab === 'write' && <Editor />}
            {activeTab === 'plot' && <PlotGrid />}
            {activeTab === 'map' && <MapView />}
            {activeTab === 'wiki' && <WikiView />}
          </div>
          <div className={"notes-panel-wrap" + (notesOpen ? " open" : "")}>
            <NotesPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
