import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import DashboardLayout from './layouts/DashboardLayout';
import Directory from './pages/Directory';
import Promo from './pages/Promo';
import Events from './pages/Events';
import Jobs from './pages/Jobs';
import ProfileView from './pages/ProfileView';
import EditProfile from './pages/EditProfile';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          
          <Route element={<ProtectedRoute />}>
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
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
