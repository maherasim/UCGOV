import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    BuildingLibraryIcon,
    UserGroupIcon,
    MapIcon,
    IdentificationIcon,
    ScaleIcon,
    PlusCircleIcon,
    UserPlusIcon,
    MegaphoneIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

const QUICK_ACTIONS = [
    { to: 'tehsils', label: 'New Tehsil', icon: PlusCircleIcon },
    { to: 'adlgs', label: 'Create ADLG', icon: UserPlusIcon },
    { to: 'newsletters', label: 'Compose Newsletter', icon: MegaphoneIcon },
];

export default function Dashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => client.get('/api/admin/dashboard').then((r) => r.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const { kpis, recent_audit: recentAudit } = data;

    return (
        <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                <KpiCard icon={MapIcon} tone="primary" label="Districts" value={kpis.districts} sub="Punjab-wide" />
                <KpiCard icon={UserGroupIcon} tone="accent" label="ADLGs" value={kpis.adlgs} sub="Active officers" />
                <KpiCard
                    icon={BuildingLibraryIcon}
                    tone="info"
                    label="Union Councils"
                    value={kpis.union_councils}
                    sub="Registered"
                />
                <KpiCard
                    icon={IdentificationIcon}
                    tone="primary"
                    label="Secretaries"
                    value={kpis.secretaries}
                    sub="Active accounts"
                />
                <KpiCard
                    icon={ScaleIcon}
                    tone="danger"
                    label="Divorce/Khula Cases"
                    value={kpis.dv_cases}
                    sub="All tehsils combined"
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">
                        Recent Audit Events
                    </h2>
                    <Card>
                        {recentAudit.length === 0 ? (
                            <div className="p-6 text-center text-sm text-ink-muted">No activity recorded yet.</div>
                        ) : (
                            <ul className="divide-y divide-border">
                                {recentAudit.map((a) => (
                                    <li key={a.id} className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <div className="text-sm font-medium text-ink">{a.note || a.action}</div>
                                            <div className="text-xs text-ink-muted">
                                                {a.action} · {a.user || 'System'}
                                            </div>
                                        </div>
                                        <div className="text-xs text-ink-faint">
                                            {new Date(a.created_at).toLocaleString()}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>

                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Quick Actions</h2>
                    <Card className="p-3">
                        <div className="space-y-1">
                            {QUICK_ACTIONS.map((action) => (
                                <Link
                                    key={action.to}
                                    to={`/admin/${action.to}`}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle"
                                >
                                    <action.icon className="h-5 w-5 text-primary-500" />
                                    {action.label}
                                </Link>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
