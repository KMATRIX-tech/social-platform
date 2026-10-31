/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { testConnection, isOwnerEmail, ADMIN_EMAIL } from './firebase';
import { recordSystemDomain } from './services/verificationService';
import { ActiveTab, CallRecipient } from './types';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { MobileBottomNav } from './components/MobileBottomNav';
import { WarningBanner } from './components/WarningBanner';
import { BannedView } from './components/BannedView';
import { FeedView } from './components/FeedView';
import { StudioEditorView } from './components/StudioEditorView';
import { VideosHubView } from './components/VideosHubView';
import { AnnouncementsView } from './components/AnnouncementsView';
import { ChatChannelsView } from './components/ChatChannelsView';
import { UserDirectoryView } from './components/UserDirectoryView';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsView } from './components/SettingsView';
import { CreatorAnalyticsView } from './components/CreatorAnalyticsView';
import { MonetizationHub } from './components/MonetizationHub';
import { CallingModal } from './components/CallingModal';
import { AdsterraManager } from './components/AdsterraManager';
import { AdsterraAdBanner } from './components/AdsterraAdBanner';
import { Waves } from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, isLoading, isAdmin, signOut } = useAuth();

  // Remember user's session tab from where they left off
  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const saved = localStorage.getItem('wavelink_last_active_tab') as ActiveTab;
    const validTabs: ActiveTab[] = ['feed', 'studio', 'videos', 'monetization', 'announcements', 'chat', 'directory', 'analytics', 'admin', 'settings'];
    return (saved && validTabs.includes(saved)) ? saved : 'feed';
  });


  const [targetChatUserId, setTargetChatUserId] = useState<string | undefined>(() => {
    return localStorage.getItem('wavelink_last_chat_target') || undefined;
  });

  const [activeCall, setActiveCall] = useState<{ type: 'video' | 'voice'; recipient?: CallRecipient } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    localStorage.setItem('wavelink_last_active_tab', tab);
  };

  const handleStartChatWithUser = (userId: string) => {
    setTargetChatUserId(userId);
    localStorage.setItem('wavelink_last_chat_target', userId);
    setActiveTab('chat');
  };

  // Test Firestore connection on boot and record current domain in Firebase
  useEffect(() => {
    testConnection();
    recordSystemDomain();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] text-[#0F172A]">
        <div className="p-4 rounded-3xl bg-gradient-to-tr from-[#3B82F6] to-[#10B981] text-white shadow-xl shadow-blue-500/20 mb-4 animate-bounce">
          <Waves size={36} />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight text-[#0F172A]">
          WaveLink
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">Opening your bright social space...</p>
      </div>
    );
  }

  // Unauthenticated user -> Unified AuthPage
  if (!currentUser) {
    return <AuthPage />;
  }

  // Account suspended by admin
  if (userProfile?.isBanned) {
    return <BannedView onOpenSupport={() => setActiveTab('settings')} />;
  }

  return (
    <div className="min-h-screen flex flex-row bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-gray-100 transition-colors">
      {/* Modern Desktop Sidebar & Mobile Drawer Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top in-app warning notice if issued by admin */}
        <WarningBanner />

        {/* Top Header Bar */}
        <TopHeader
          activeTab={activeTab}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onStartChat={handleStartChatWithUser}
          onSelectHashtag={(tag) => {
            setSelectedHashtag(tag);
            setActiveTab('feed');
          }}
        />

        {/* Main Body View based on tab */}
        <main className="flex-1 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          {activeTab === 'feed' && (
            <FeedView
              onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
              initialFilterTag={selectedHashtag}
              onClearFilterTag={() => setSelectedHashtag(null)}
            />
          )}
          {activeTab === 'studio' && (
            <StudioEditorView onNavigateToFeed={() => setActiveTab('feed')} />
          )}
          {activeTab === 'videos' && (
            <VideosHubView onNavigateToFeed={() => setActiveTab('feed')} />
          )}
          {activeTab === 'announcements' && <AnnouncementsView />}
          {activeTab === 'chat' && (
            <ChatChannelsView
              onOpenCall={(type, recipient) => setActiveCall({ type, recipient })}
              initialTargetUserId={targetChatUserId}
            />
          )}
          {activeTab === 'directory' && (
            <UserDirectoryView onStartChat={handleStartChatWithUser} />
          )}
          {activeTab === 'analytics' && (
            <CreatorAnalyticsView onOpenUpgradeModal={() => setActiveTab('monetization')} />
          )}
          {activeTab === 'monetization' && (
            <MonetizationHub onNavigateToFeed={() => setActiveTab('feed')} />
          )}
          {activeTab === 'admin' && (
            <AdminDashboard onReturnToFeed={() => setActiveTab('feed')} />
          )}
          {activeTab === 'settings' && <SettingsView />}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* WebRTC Video & Voice Calling Overlay Modal (Only for person you chat with) */}
      {activeCall && (
        <CallingModal
          initialType={activeCall.type}
          recipient={activeCall.recipient}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Global Adsterra Script & Ad Unit Lifecycle Controller (Hidden for Pro, Blue Star & Admin) */}
      <AdsterraManager />

      {/* Adsterra Social Bar Banner (Visible only for free users, instant auto-hide when upgrading to Pro) */}
      <AdsterraAdBanner
        variant="social_bar"
        onOpenUpgradeModal={() => setActiveTab('monetization')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
