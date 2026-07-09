import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FullScreenSpinner } from './components/ui';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Divisions from './pages/admin/Divisions';
import Districts from './pages/admin/Districts';
import Tehsils from './pages/admin/Tehsils';
import Adlgs from './pages/admin/Adlgs';
import AuditLog from './pages/admin/AuditLog';
import Inquiries from './pages/admin/Inquiries';
import Newsletters from './pages/admin/Newsletters';
import Profiles from './pages/admin/Profiles';
import Profile from './pages/admin/Profile';

function RequireSuperAdmin({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <FullScreenSpinner />;
    if (!user || user.role !== 'sa') return <Navigate to="/login" replace />;

    return children;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/admin"
                element={
                    <RequireSuperAdmin>
                        <AdminLayout />
                    </RequireSuperAdmin>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="divisions" element={<Divisions />} />
                <Route path="districts" element={<Districts />} />
                <Route path="tehsils" element={<Tehsils />} />
                <Route path="adlgs" element={<Adlgs />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="inquiries" element={<Inquiries />} />
                <Route path="newsletters" element={<Newsletters />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="profile" element={<Profile />} />
            </Route>
            <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
    );
}
