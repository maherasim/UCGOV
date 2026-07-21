import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { FullScreenSpinner } from './components/ui';
import Login from './pages/Login';
import FirstLoginSetup from './pages/FirstLoginSetup';

import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Divisions from './pages/admin/Divisions';
import Districts from './pages/admin/Districts';
import Tehsils from './pages/admin/Tehsils';
import Adlgs from './pages/admin/Adlgs';
import Ddlgs from './pages/admin/Ddlgs';
import AdminUnionCouncils from './pages/admin/UnionCouncils';
import AdminSecretaries from './pages/admin/Secretaries';
import AuditLog from './pages/admin/AuditLog';
import AdminInquiries from './pages/admin/Inquiries';
import AdminNewsletters from './pages/admin/Newsletters';
import AdminDklic from './pages/admin/Dklic';
import Profiles from './pages/admin/Profiles';
import AdminProfile from './pages/admin/Profile';

import AdlgLayout from './layouts/AdlgLayout';
import AdlgDashboard from './pages/adlg/Dashboard';
import UnionCouncils from './pages/adlg/UnionCouncils';
import Secretaries from './pages/adlg/Secretaries';
import Cases from './pages/adlg/Cases';
import AdlgAttendance from './pages/adlg/Attendance';
import AdlgReports from './pages/adlg/Reports';
import AdlgNewsletters from './pages/adlg/Newsletters';
import AdlgInquiries from './pages/adlg/Inquiries';
import AdlgDklic from './pages/adlg/Dklic';
import AdlgLbr from './pages/adlg/Lbr';
import AdlgProfile from './pages/adlg/Profile';

import DdlgLayout from './layouts/DdlgLayout';
import DdlgDashboard from './pages/ddlg/Dashboard';
import DdlgTehsils from './pages/ddlg/Tehsils';
import DdlgUnionCouncils from './pages/ddlg/UnionCouncils';
import DdlgSecretaries from './pages/ddlg/Secretaries';
import DdlgAdlgs from './pages/ddlg/Adlgs';
import DdlgCases from './pages/ddlg/Cases';
import DdlgLbr from './pages/ddlg/Lbr';
import DdlgAttendance from './pages/ddlg/Attendance';
import DdlgReports from './pages/ddlg/Reports';
import DdlgInquiries from './pages/ddlg/Inquiries';
import DdlgNewsletters from './pages/ddlg/Newsletters';
import DdlgDklic from './pages/ddlg/Dklic';
import DdlgProfile from './pages/ddlg/Profile';

import SecLayout from './layouts/SecLayout';
import SecDashboard from './pages/sec/Dashboard';
import SecAttendance from './pages/sec/Attendance';
import SecReports from './pages/sec/Reports';
import SecCases from './pages/sec/Cases';
import SecLbr from './pages/sec/Lbr';
import SecDklic from './pages/sec/Dklic';
import SecProfile from './pages/sec/Profile';

const ROLE_HOME = {
    sa: '/admin/dashboard',
    adlg: '/adlg/dashboard',
    ddlg: '/ddlg/dashboard',
    sec: '/sec/dashboard',
};

function RequireRole({ role, children }) {
    const { user, loading } = useAuth();

    if (loading) return <FullScreenSpinner />;
    if (!user || user.role !== role) return <Navigate to="/login" replace />;
    if (user.first_login) return <Navigate to="/first-login-setup" replace />;

    return children;
}

function RequireFirstLogin({ children }) {
    const { user, loading } = useAuth();

    if (loading) return <FullScreenSpinner />;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.first_login) return <Navigate to={ROLE_HOME[user.role] || '/login'} replace />;

    return children;
}

function DefaultRedirect() {
    const { user, loading } = useAuth();

    if (loading) return <FullScreenSpinner />;
    if (user?.first_login) return <Navigate to="/first-login-setup" replace />;

    return <Navigate to={(user && ROLE_HOME[user.role]) || '/login'} replace />;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/first-login-setup"
                element={
                    <RequireFirstLogin>
                        <FirstLoginSetup />
                    </RequireFirstLogin>
                }
            />

            <Route
                path="/admin"
                element={
                    <RequireRole role="sa">
                        <AdminLayout />
                    </RequireRole>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="divisions" element={<Divisions />} />
                <Route path="districts" element={<Districts />} />
                <Route path="tehsils" element={<Tehsils />} />
                <Route path="union-councils" element={<AdminUnionCouncils />} />
                <Route path="adlgs" element={<Adlgs />} />
                <Route path="ddlgs" element={<Ddlgs />} />
                <Route path="secretaries" element={<AdminSecretaries />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="inquiries" element={<AdminInquiries />} />
                <Route path="newsletters" element={<AdminNewsletters />} />
                <Route path="dklic" element={<AdminDklic />} />
                <Route path="profiles" element={<Profiles />} />
                <Route path="profile" element={<AdminProfile />} />
            </Route>

            <Route
                path="/adlg"
                element={
                    <RequireRole role="adlg">
                        <AdlgLayout />
                    </RequireRole>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdlgDashboard />} />
                <Route path="union-councils" element={<UnionCouncils />} />
                <Route path="secretaries" element={<Secretaries />} />
                <Route path="cases" element={<Cases />} />
                <Route path="lbr" element={<AdlgLbr />} />
                <Route path="attendance" element={<AdlgAttendance />} />
                <Route path="reports" element={<AdlgReports />} />
                <Route path="newsletters" element={<AdlgNewsletters />} />
                <Route path="dklic" element={<AdlgDklic />} />
                <Route path="inquiries" element={<AdlgInquiries />} />
                <Route path="profile" element={<AdlgProfile />} />
            </Route>

            <Route
                path="/ddlg"
                element={
                    <RequireRole role="ddlg">
                        <DdlgLayout />
                    </RequireRole>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DdlgDashboard />} />
                <Route path="tehsils" element={<DdlgTehsils />} />
                <Route path="union-councils" element={<DdlgUnionCouncils />} />
                <Route path="secretaries" element={<DdlgSecretaries />} />
                <Route path="adlgs" element={<DdlgAdlgs />} />
                <Route path="cases" element={<DdlgCases />} />
                <Route path="lbr" element={<DdlgLbr />} />
                <Route path="attendance" element={<DdlgAttendance />} />
                <Route path="reports" element={<DdlgReports />} />
                <Route path="newsletters" element={<DdlgNewsletters />} />
                <Route path="dklic" element={<DdlgDklic />} />
                <Route path="inquiries" element={<DdlgInquiries />} />
                <Route path="profile" element={<DdlgProfile />} />
            </Route>

            <Route
                path="/sec"
                element={
                    <RequireRole role="sec">
                        <SecLayout />
                    </RequireRole>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<SecDashboard />} />
                <Route path="attendance" element={<SecAttendance />} />
                <Route path="reports" element={<SecReports />} />
                <Route path="cases" element={<SecCases />} />
                <Route path="lbr" element={<SecLbr />} />
                <Route path="dklic" element={<SecDklic />} />
                <Route path="profile" element={<SecProfile />} />
            </Route>

            <Route path="*" element={<DefaultRedirect />} />
        </Routes>
    );
}
