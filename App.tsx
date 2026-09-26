
import React, { useState, useEffect } from 'react';
import Dashboard from './screens/Dashboard';
import AuthScreen from './screens/AuthScreen';
import StaffLogin from './screens/StaffLogin';
import StaffDashboard from './screens/StaffDashboard';
import OBSOverlay from './screens/OBSOverlay';
import ProjectorScreen from './screens/ProjectorScreen';
import LandingPage from './screens/LandingPage';
import AdminDashboard from './screens/AdminDashboard';
import SuperAdminDashboard from './screens/SuperAdminDashboard';
import CreateAuction from './screens/CreateAuction';
import AuctionManage from './screens/AuctionManage';
import CategoryArrangement from './screens/CategoryArrangement';
import PlayerRegistration from './screens/PlayerRegistration';
import CuratorPortal from './screens/CuratorPortal';
import ScoringDashboard from './screens/ScoringDashboard';
import MatchScorer from './screens/MatchScorer';
import MatchOverlay from './screens/MatchOverlay';
import PlatformGuide from './screens/PlatformGuide';
import SupportWidget from './components/SupportWidget';
import RecollectionManager from './screens/RecollectionManager';
import RecollectionPublicForm from './screens/RecollectionPublicForm';
import { useAuction } from './hooks/useAuction';
import { ThemeProvider } from './contexts/ThemeContext';
import { auth } from './firebase';
import firebase from 'firebase/compat/app';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from './types';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Something went wrong</h2>
            <p className="text-zinc-400 text-sm font-medium mb-8">
              {this.state.error?.message || "An unexpected error occurred in the application."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { userProfile, activeAuctionId, state } = useAuction();
  const [user, setUser] = useState<firebase.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading || (user && !userProfile)) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
         <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-highlight mb-4"></div>
            <p className="text-highlight text-xl animate-pulse">Loading SM SPORTS...</p>
        </div>
      </div>
    );
  }

  const isLoggedIn = !!user;
  const isSuperAdmin = userProfile?.role === UserRole.SUPER_ADMIN;
  const isSupportStaff = userProfile?.role === UserRole.SUPPORT;
  const isAdmin = userProfile?.role === UserRole.ADMIN || isSuperAdmin || isSupportStaff;
  const isTeamOwner = userProfile?.role === UserRole.TEAM_OWNER;

  const getAuthRedirect = () => {
      if (isSuperAdmin) return "/super-admin";
      if (isSupportStaff) return "/staff-dashboard";
      if (isAdmin) return "/admin";
      if (isTeamOwner && activeAuctionId) return `/auction/${activeAuctionId}`;
      return "/";
  };

  // Visibility Logic: Hide Support Widget on Landing Page or OBS Views
  const isLandingPage = location.pathname === '/';
  const isObsView = location.pathname.includes('obs-') || location.pathname.includes('match-overlay');
  const isRegistrationPage = location.pathname.includes('/register');
  const showSupport = isLoggedIn && !isSupportStaff && !isLandingPage && !isObsView && !isRegistrationPage;

  return (
    <ErrorBoundary>
      <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/guide" element={<PlatformGuide />} />
          <Route path="/auction/:id" element={<Dashboard />} />
          <Route path="/auction/:id/curator" element={<CuratorPortal />} />
          <Route path="/auction/:id/register" element={<PlayerRegistration />} />

          <Route path="/auth" element={
              isLoggedIn ? <Navigate to={getAuthRedirect()} replace /> : <AuthScreen />
          } />

          <Route path="/staff-login" element={
              isLoggedIn ? <Navigate to={getAuthRedirect()} replace /> : <StaffLogin />
          } />

          <Route path="/staff-dashboard" element={
              isSupportStaff ? <StaffDashboard /> : <Navigate to="/staff-login" replace />
          } />

          <Route path="/super-admin" element={
              isSuperAdmin ? <SuperAdminDashboard /> : <Navigate to="/auth" replace />
          } />

          <Route path="/admin" element={
              isAdmin ? <AdminDashboard /> : <Navigate to="/auth" replace />
          } />
          
          <Route path="/admin/new" element={
              isAdmin ? <CreateAuction /> : <Navigate to="/auth" replace />
          } />
          
          <Route path="/admin/auction/:id/manage" element={
              isAdmin ? <AuctionManage /> : <Navigate to="/auth" replace />
          } />
          
          <Route path="/admin/auction/:id/arrangement" element={
              isAdmin ? <CategoryArrangement /> : <Navigate to="/auth" replace />
          } />

          <Route path="/scoring" element={
              isAdmin && !state.hideScoringSection ? <ScoringDashboard /> : <Navigate to="/admin" replace />
          } />
          <Route path="/scoring/:matchId" element={
              isAdmin && !state.hideScoringSection ? <MatchScorer /> : <Navigate to="/admin" replace />
          } />
          <Route path="/match-overlay/:matchId" element={<MatchOverlay />} />

          <Route path="/obs-overlay/:id" element={<OBSOverlay />} />
          <Route path="/obs-green/:id" element={<ProjectorScreen />} />

          <Route path="/admin/auction/:id/recollection" element={
              isAdmin ? <RecollectionManager /> : <Navigate to="/auth" replace />
          } />
          
          <Route path="/recollect/:auctionId/:formId" element={<RecollectionPublicForm />} />

          <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {showSupport && <SupportWidget />}
    </ErrorBoundary>
  );
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
};

export default App;
