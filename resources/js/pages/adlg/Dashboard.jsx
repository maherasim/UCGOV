import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    BuildingLibraryIcon,
    IdentificationIcon,
    ExclamationTriangleIcon,
    ScaleIcon,
    ClockIcon,
    FireIcon,
    CheckBadgeIcon,
    NewspaperIcon,
    PlusCircleIcon,
    UserPlusIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import ActivityTimeline from '../../components/ActivityTimeline';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

const QUICK_ACTIONS = [
    { to: 'cases', label: 'Review Cases', icon: ScaleIcon },
    { to: 'union-councils', label: 'New Union Council', icon: PlusCircleIcon },
    { to: 'secretaries', label: 'Create Secretary', icon: UserPlusIcon },
];

export default function Dashboard() {
    const { data, isLoading } = useQuery({
        queryKey: ['adlg-dashboard'],
        queryFn: () => client.get('/api/adlg/dashboard').then((r) => r.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const { kpis, recent_audit: recentAudit } = data;

    return (
        <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard icon={BuildingLibraryIcon} tone="primary" label="Union Councils" value={kpis.union_councils} />
                <KpiCard icon={IdentificationIcon} tone="accent" label="Secretaries" value={kpis.secretaries} />
                <KpiCard
                    icon={ExclamationTriangleIcon}
                    tone={kpis.vacant_ucs > 0 ? 'danger' : 'primary'}
                    label="Vacant UCs"
                    value={kpis.vacant_ucs}
                    sub="No secretary assigned"
                />
                <KpiCard icon={ScaleIcon} tone="info" label="Total Cases" value={kpis.total_cases} />

                <KpiCard icon={ClockIcon} tone="accent" label="Active Cases" value={kpis.active_cases} sub="In progress" />
                <KpiCard
                    icon={FireIcon}
                    tone={kpis.urgent_cases > 0 ? 'danger' : 'primary'}
                    label="Urgent Cases"
                    value={kpis.urgent_cases}
                    sub="≤ 3 days remaining"
                />
                <KpiCard icon={CheckBadgeIcon} tone="primary" label="Disposed Cases" value={kpis.disposed_cases} />
                <KpiCard
                    icon={NewspaperIcon}
                    tone={kpis.pending_newsletters > 0 ? 'danger' : 'primary'}
                    label="Pending Newsletters"
                    value={kpis.pending_newsletters}
                    sub="Awaiting your response"
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">My Recent Activity</h2>
                    <Card>
                        <ActivityTimeline events={recentAudit.slice(0, 8)} />
                    </Card>
                </div>

                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Quick Actions</h2>
                    <Card className="p-3">
                        <div className="space-y-1">
                            {QUICK_ACTIONS.map((action) => (
                                <Link
                                    key={action.to}
                                    to={`/adlg/${action.to}`}
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
