import { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    Squares2X2Icon,
    FingerPrintIcon,
    ClipboardDocumentListIcon,
    ScaleIcon,
    BookOpenIcon,
    UserGroupIcon,
    Cog6ToothIcon,
    ChevronDownIcon,
    ArrowRightStartOnRectangleIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import ConnectivityMonitor from '../components/ConnectivityMonitor';
import LiveLocationTracker from '../components/LiveLocationTracker';
import NotificationBell from '../components/NotificationBell';
import { APP_BASE_PATH } from '../utils/basePath';
import { MovementLogProvider, useMovementLog } from '../context/MovementLogContext';

const NAV_GROUPS = [
    {
        label: 'Overview',
        items: [{ to: 'dashboard', label: 'Dashboard', icon: Squares2X2Icon }],
    },
    {
        label: 'Daily Duties',
        items: [
            { to: 'attendance', label: 'Attendance', icon: FingerPrintIcon },
            { to: 'reports', label: 'Reports', icon: ClipboardDocumentListIcon },
        ],
    },
    {
        label: 'Registry',
        items: [
            { to: 'cases', label: 'Divorce/Khula Cases', icon: ScaleIcon },
            { to: 'lbr', label: 'Birth Registration', icon: UserGroupIcon },
        ],
    },
    {
        label: 'Communications',
        items: [{ to: 'dklic', label: 'Knowledge', icon: BookOpenIcon }],
    },
    {
        label: 'Account',
        items: [{ to: 'profile', label: 'Settings', icon: Cog6ToothIcon }],
    },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function MovementQuickAction() {
    const { openMovementLog } = useMovementLog();

    return (
        <div className="mt-3 rounded-xl border border-dashed border-accent-400/50 bg-accent-500/10 p-3">
            <button
                onClick={() => openMovementLog(false)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-accent-400/60 bg-transparent px-3 py-2.5 text-sm font-semibold text-accent-100 transition hover:border-accent-500 hover:bg-accent-500 hover:text-white"
            >
                <MapPinIcon className="h-5 w-5 flex-shrink-0" />
                Log Movement
            </button>
            <p className="mt-2 px-0.5 text-[10.5px] leading-snug text-white/50">
                Leaving your UC office during working hours? Log it here so it's on record.
            </p>
        </div>
    );
}

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
                        {user?.secretary_profile?.union_council ? `Secretary · ${user.secretary_profile.union_council}` : 'Secretary UC'}
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

export default function SecLayout() {
    const location = useLocation();
    const current = ALL_ITEMS.find((i) => location.pathname.endsWith(i.to));

    return (
        <MovementLogProvider>
            <div className="flex min-h-screen bg-surface-subtle">
                <LiveLocationTracker />
                <ConnectivityMonitor />
                <aside className="flex w-64 flex-shrink-0 flex-col bg-primary-700 text-white">
                    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white p-1">
                            <img src={`${APP_BASE_PATH}/localgovrment.png`} alt="Government of Punjab" className="h-full w-full object-contain" />
                        </div>
                        <div>
                            <div className="text-sm font-bold leading-tight">UC Governance</div>
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
                                {group.label === 'Daily Duties' && <MovementQuickAction />}
                            </div>
                        ))}
                    </nav>

                    <div className="border-t border-white/10 px-5 py-4 text-[10px] text-white/40">
                        UC Governance Platform v1.0 · Secretary
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
        </MovementLogProvider>
    );
}
