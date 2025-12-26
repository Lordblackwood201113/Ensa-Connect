import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import DashboardLayout from './layouts/DashboardLayout';
import Home from './pages/Home';
import Directory from './pages/Directory';
import Promo from './pages/Promo';
import Events from './pages/Events';
import Jobs from './pages/Jobs';
import Discussions from './pages/Discussions';
import Connections from './pages/Connections';
import ProfileView from './pages/ProfileView';
import EditProfile from './pages/EditProfile';
import Admin from './pages/Admin';
import { Messages } from './pages/Messages';
import { Conversation } from './pages/Conversation';
import ProtectedRoute from './components/ProtectedRoute';
import { InstallPWAPrompt } from './components/pwa/InstallPWAPrompt';
import { UpdatePrompt } from './components/pwa/UpdatePrompt';
import { PasswordChangeGuard } from './components/auth/PasswordChangeGuard';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PasswordChangeGuard>
          <InstallPWAPrompt />
          <UpdatePrompt />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={
              <DashboardLayout>
                <Home />
              </DashboardLayout>
            } />
            <Route path="/dashboard" element={
              <DashboardLayout>
                <Directory />
              </DashboardLayout>
            } />
            <Route path="/promo" element={
              <DashboardLayout>
                <Promo />
              </DashboardLayout>
            } />
            <Route path="/events" element={
              <DashboardLayout>
                <Events />
              </DashboardLayout>
            } />
            <Route path="/jobs" element={
              <DashboardLayout>
                <Jobs />
              </DashboardLayout>
            } />
            <Route path="/discussions" element={
              <DashboardLayout>
                <Discussions />
              </DashboardLayout>
            } />

            <Route path="/connections" element={
              <DashboardLayout>
                <Connections />
              </DashboardLayout>
            } />
            <Route path="/messages" element={
              <DashboardLayout>
                <Messages />
              </DashboardLayout>
            } />
            <Route path="/messages/:conversationId" element={
              <DashboardLayout>
                <Conversation />
              </DashboardLayout>
            } />
            <Route path="/member/:id" element={
              <DashboardLayout>
                <ProfileView />
              </DashboardLayout>
            } />
             <Route path="/profile/edit" element={
              <DashboardLayout>
                <EditProfile />
              </DashboardLayout>
            } />
            <Route path="/admin" element={
              <DashboardLayout>
                <Admin />
              </DashboardLayout>
            } />
             <Route path="/" element={<Navigate to="/home" replace />} />
          </Route>
          </Routes>
        </PasswordChangeGuard>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
