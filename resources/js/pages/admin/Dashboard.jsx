import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ScaleIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    FingerPrintIcon,
    PlusCircleIcon,
    UserPlusIcon,
    MegaphoneIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import ActivityTimeline from '../../components/ActivityTimeline';
import { CHART_COLORS, HorizontalBarChart, StackedBarChart, TrendChart } from '../../components/charts';
import LiveBadge from '../../components/LiveBadge';
import SectionHeader from '../../components/SectionHeader';
import { Badge, Card, FullScreenSpinner, KpiCard } from '../../components/ui';

const QUICK_ACTIONS = [
    { to: 'tehsils', label: 'New Tehsil', icon: PlusCircleIcon },
    { to: 'adlgs', label: 'Create ADLG', icon: UserPlusIcon },
    { to: 'newsletters', label: 'Compose Newsletter', icon: MegaphoneIcon },
];

const DISPOSITION_COLORS = {
    DISPOSED_RECONCILED: CHART_COLORS.primary,
    DISPOSED_EFFECTIVE: CHART_COLORS.info,
    FILED_NON_RESPONSE: CHART_COLORS.accent,
};

export default function Dashboard() {
    const { data, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ['dashboard'],
        queryFn: () => client.get('/api/admin/dashboard').then((r) => r.data),
        refetchInterval: 20000,
    });

    if (isLoading) return <FullScreenSpinner />;

    const {
        kpis,
        recent_audit: recentAudit,
        recent_adlgs: recentAdlgs,
        today_attendance: todayAttendance,
        attendance_trend: attendanceTrend,
        case_pipeline: casePipeline,
        case_disposition: caseDisposition,
        daily_trend: dailyTrend,
        vacant_by_district: vacantByDistrict,
    } = data;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-ink-muted">Real-time snapshot of the UC Governance Platform, Punjab-wide.</div>
                <LiveBadge dataUpdatedAt={dataUpdatedAt} />
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard icon={ScaleIcon} tone="accent" label="Active DV Cases" value={kpis.active_cases} sub={`${kpis.dv_cases} total filed`} />
                <KpiCard
                    icon={DocumentTextIcon}
                    tone={kpis.pending_inquiries > 0 ? 'danger' : 'primary'}
                    label="Pending Inquiries"
                    value={kpis.pending_inquiries}
                />
                <KpiCard
                    icon={ExclamationTriangleIcon}
                    tone={kpis.vacant_ucs > 0 ? 'danger' : 'primary'}
                    label="Vacant UCs"
                    value={kpis.vacant_ucs}
                    sub="No secretary assigned"
                />
                <KpiCard
                    icon={FingerPrintIcon}
                    tone={todayAttendance.rate >= 70 ? 'primary' : todayAttendance.rate >= 40 ? 'accent' : 'danger'}
                    label="Today's Attendance"
                    value={`${todayAttendance.rate}%`}
                    sub={`${todayAttendance.marked} of ${todayAttendance.total} secretaries`}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-5">
                        <SectionHeader
                            title="Case Pipeline"
                            subtitle="Where the province's Divorce/Khula caseload currently sits"
                            action={
                                <Link to="/admin/audit-log" className="text-xs font-semibold text-primary-600 hover:underline">
                                    Audit trail →
                                </Link>
                            }
                        />
                        <HorizontalBarChart
                            data={casePipeline.map((s) => ({ label: s.label, value: s.count }))}
                            color={CHART_COLORS.primary}
                            emptyLabel="No Divorce/Khula cases filed yet."
                        />
                    </Card>

                    <Card className="p-5">
                        <SectionHeader title="Case Activity — Last 14 Days" subtitle="New Divorce/Khula filings vs. new Birth Registrations" />
                        <TrendChart
                            data={dailyTrend}
                            series={[
                                { key: 'dv_cases', label: 'Divorce/Khula', color: CHART_COLORS.primary, area: true },
                                { key: 'lbr_cases', label: 'Birth Registration', color: CHART_COLORS.info, area: false },
                            ]}
                        />
                    </Card>

                    <Card className="p-5">
                        <SectionHeader title="Case Outcomes" subtitle="How disposed Divorce/Khula cases resolved, all-time" />
                        <StackedBarChart
                            segments={caseDisposition.map((s) => ({ key: s.key, label: s.label, value: s.count, color: DISPOSITION_COLORS[s.key] }))}
                        />
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <SectionHeader title="Attendance Trend" subtitle="% of secretaries marked present, last 14 days" />
                        <div className="mb-3">
                            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-ink-muted">
                                <span>Today</span>
                                <span className="text-ink">{todayAttendance.marked} / {todayAttendance.total}</span>
                            </div>
                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary-50">
                                <div
                                    className="h-full rounded-full bg-primary-500 transition-all"
                                    style={{ width: `${Math.min(100, todayAttendance.rate)}%` }}
                                />
                            </div>
                        </div>
                        <TrendChart
                            data={attendanceTrend}
                            height={140}
                            series={[{ key: 'rate', label: 'Attendance Rate', color: CHART_COLORS.primary, area: true }]}
                            valueFormatter={(v) => `${v}%`}
                            yTickFormatter={(v) => `${v}%`}
                        />
                    </Card>

                    <Card className="p-5">
                        <SectionHeader
                            title="Coverage Gaps"
                            subtitle="Districts with the most vacant Union Councils"
                            action={
                                <Link to="/admin/union-councils" className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline">
                                    <MapPinIcon className="h-3.5 w-3.5" /> View all
                                </Link>
                            }
                        />
                        <HorizontalBarChart
                            data={vacantByDistrict.map((d) => ({ label: d.district, value: d.count }))}
                            color={CHART_COLORS.danger}
                            emptyLabel="Every Union Council is covered. 🎉"
                        />
                    </Card>

                    <div>
                        <SectionHeader
                            title="Live Activity"
                            action={
                                <Link to="/admin/audit-log" className="text-xs font-semibold text-primary-600 hover:underline">
                                    View all →
                                </Link>
                            }
                        />
                        <Card>
                            <ActivityTimeline events={recentAudit.slice(0, 8)} />
                        </Card>
                    </div>

                    <div>
                        <SectionHeader title="Quick Actions" />
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
                        <SectionHeader title="Recently Added ADLGs" />
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
