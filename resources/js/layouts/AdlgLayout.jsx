import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Squares2X2Icon,
    ScaleIcon,
    BuildingLibraryIcon,
    IdentificationIcon,
    FingerPrintIcon,
    ClipboardDocumentListIcon,
    NewspaperIcon,
    DocumentTextIcon,
    BookOpenIcon,
    UserGroupIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
    ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import AttendanceAnalyticsPopup from '../components/AttendanceAnalyticsPopup';
import NotificationBell from '../components/NotificationBell';
import { APP_BASE_PATH } from '../utils/basePath';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [{ to: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon }],
    },
    {
        label: 'Registry',
        items: [
            { to: 'cases', label: 'Divorce/Khula Cases', icon: ScaleIcon },
            { to: 'lbr', label: 'Birth Registration', icon: UserGroupIcon },
        ],
    },
    {
        label: 'Management',
        items: [
            { to: 'union-councils', label: 'Union Councils', icon: BuildingLibraryIcon },
            { to: 'secretaries', label: 'Secretaries', icon: IdentificationIcon },
            { to: 'attendance', label: 'Attendance', icon: FingerPrintIcon },
            { to: 'reports', label: 'Reports', icon: ClipboardDocumentListIcon },
        ],
    },
    {
        label: 'Communications',
        items: [
            { to: 'newsletters', label: 'Newsletters', icon: NewspaperIcon },
            { to: 'dklic', label: 'Knowledge', icon: BookOpenIcon },
            { to: 'inquiries', label: 'Inquiry', icon: DocumentTextIcon },
        ],
    },
    {
        label: 'Account',
        items: [{ to: 'profile', label: 'Settings', icon: Cog6ToothIcon }],
    },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function UserMenu() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2.5 hover:bg-surface-subtle"
            >
                <Avatar user={user} size="sm" />
                <div className="text-left">
                    <div className="text-sm font-semibold leading-tight text-ink">{user?.name}</div>
                    <div className="text-xs leading-tight text-ink-muted">
                        {user?.adlg_profile?.tehsil ? `ADLG · ${user.adlg_profile.tehsil}` : 'Assistant Director LG'}
                    </div>
                </div>
                <ChevronDownIcon className="h-4 w-4 text-ink-faint" />
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
                    <NavLink
                        to="profile"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-ink hover:bg-surface-subtle"
                    >
                        <Cog6ToothIcon className="h-4 w-4" /> Profile &amp; Settings
                    </NavLink>
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-red-50"
                    >
                        <ArrowRightStartOnRectangleIcon className="h-4 w-4" /> Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdlgLayout() {
    const location = useLocation();
    const current = ALL_ITEMS.find((i) => location.pathname.endsWith(i.to));

    return (
        <div className="flex min-h-screen bg-surface-subtle">
            <AttendanceAnalyticsPopup />
            <aside className="flex w-64 flex-shrink-0 flex-col bg-primary-700 text-white">
                <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1">
                        <img src={`${APP_BASE_PATH}/localgovrment.png`} alt="Government of Punjab" className="h-full w-full object-contain" />
                    </div>
                    <div>
                        <div className="text-[11px] font-bold leading-snug tracking-tight">Personal Assistant to ADLG for UCs' Management</div>
                        <div className="text-[11px] text-white/60">Govt. of Punjab</div>
                    </div>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label}>
                            <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-white/40">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                                isActive
                                                    ? 'bg-accent-500 text-white shadow-sm'
                                                    : 'text-white/75 hover:bg-white/10 hover:text-white'
                                            }`
                                        }
                                    >
                                        <item.icon className="h-5 w-5 flex-shrink-0" />
                                        {item.label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t border-white/10 px-5 py-4 text-[10px] text-white/40">
                    Personal Assistant to ADLG for UCs' Management v1.0
                </div>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col">
                <header className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6 py-3.5">
                    <div>
                        <h1 className="text-base font-bold text-ink">{current?.label || 'Dashboard'}</h1>
                        <p className="text-xs text-ink-muted">Union Council Governance &amp; Administration</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <div className="h-6 w-px bg-border" />
                        <UserMenu />
                    </div>
                </header>
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
