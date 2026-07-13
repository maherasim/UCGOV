import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    GlobeAsiaAustraliaIcon,
    MapPinIcon,
    BuildingLibraryIcon,
    UserGroupIcon,
    IdentificationIcon,
    ScaleIcon,
    NewspaperIcon,
    DocumentTextIcon,
    ShieldCheckIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    PlusCircleIcon,
    UserPlusIcon,
    MegaphoneIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import ActivityTimeline from '../../components/ActivityTimeline';
import { Badge, Card, FullScreenSpinner, KpiCard } from '../../components/ui';

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

    const { kpis, adlg_coverage: coverage, recent_audit: recentAudit, recent_adlgs: recentAdlgs } = data;

    return (
        <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard icon={GlobeAsiaAustraliaIcon} tone="primary" label="Divisions" value={kpis.divisions} sub="Punjab-wide" />
                <KpiCard icon={MapPinIcon} tone="accent" label="Districts" value={kpis.districts} />
                <KpiCard icon={BuildingLibraryIcon} tone="info" label="Tehsils" value={kpis.tehsils} />
                <KpiCard icon={BuildingLibraryIcon} tone="primary" label="Union Councils" value={kpis.union_councils} />

                <KpiCard icon={UserGroupIcon} tone="accent" label="ADLGs" value={kpis.adlgs} sub="Active officers" />
                <KpiCard icon={IdentificationIcon} tone="primary" label="Secretaries" value={kpis.secretaries} />
                <KpiCard
                    icon={ShieldCheckIcon}
                    tone={kpis.adlg_coverage_pct === 100 ? 'primary' : 'accent'}
                    label="ADLG Coverage"
                    value={`${kpis.adlg_coverage_pct}%`}
                    sub={`${coverage.activated} of ${coverage.total} tehsils`}
                />
                <KpiCard
                    icon={ExclamationTriangleIcon}
                    tone={kpis.vacant_ucs > 0 ? 'danger' : 'primary'}
                    label="Vacant UCs"
                    value={kpis.vacant_ucs}
                    sub="No secretary assigned"
                />

                <KpiCard icon={ScaleIcon} tone="danger" label="Divorce/Khula Cases" value={kpis.dv_cases} />
                <KpiCard icon={ClockIcon} tone="accent" label="Active Cases" value={kpis.active_cases} sub="In progress" />
                <KpiCard icon={NewspaperIcon} tone="info" label="Newsletters Published" value={kpis.newsletters} />
                <KpiCard
                    icon={DocumentTextIcon}
                    tone={kpis.pending_inquiries > 0 ? 'danger' : 'primary'}
                    label="Pending Inquiries"
                    value={kpis.pending_inquiries}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-muted">Recent Audit Events</h2>
                        <Link to="/admin/audit-log" className="text-xs font-semibold text-primary-600 hover:underline">
                            View all →
                        </Link>
                    </div>
                    <Card>
                        <ActivityTimeline events={recentAudit.slice(0, 8)} />
                    </Card>
                </div>

                <div className="space-y-6">
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

                    <div>
                        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Recently Added ADLGs</h2>
                        <Card>
                            {recentAdlgs.length === 0 ? (
                                <div className="p-6 text-center text-sm text-ink-muted">None yet.</div>
                            ) : (
                                <ul className="divide-y divide-border">
                                    {recentAdlgs.map((a) => (
                                        <li key={a.id} className="flex items-center justify-between px-4 py-3">
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-medium text-ink">{a.name}</div>
                                                <div className="text-xs text-ink-muted">{a.tehsil || '—'}</div>
                                            </div>
                                            <Badge tone={a.active ? 'success' : 'danger'}>{a.active ? 'Active' : 'Inactive'}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
