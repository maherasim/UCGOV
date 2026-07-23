import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ExclamationTriangleIcon,
    ScaleIcon,
    FireIcon,
    FingerPrintIcon,
    PlusCircleIcon,
    UserPlusIcon,
    NewspaperIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import ActivityTimeline from '../../components/ActivityTimeline';
import AdlgAiChat from '../../components/AdlgAiChat';
import { CHART_COLORS, HorizontalBarChart, StackedBarChart, TrendChart } from '../../components/charts';
import LiveBadge from '../../components/LiveBadge';
import SectionHeader from '../../components/SectionHeader';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

const QUICK_ACTIONS = [
    { to: 'cases', label: 'Review Cases', icon: ScaleIcon },
    { to: 'union-councils', label: 'New Union Council', icon: PlusCircleIcon },
    { to: 'secretaries', label: 'Create Secretary', icon: UserPlusIcon },
];

const DISPOSITION_COLORS = {
    DISPOSED_RECONCILED: CHART_COLORS.success,
    DISPOSED_EFFECTIVE: CHART_COLORS.info,
    FILED_NON_RESPONSE: CHART_COLORS.accent,
};

export default function Dashboard() {
    const { data, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ['adlg-dashboard'],
        queryFn: () => client.get('/api/adlg/dashboard').then((r) => r.data),
        refetchInterval: 20000,
    });

    if (isLoading) return <FullScreenSpinner />;

    const {
        kpis,
        recent_audit: recentAudit,
        today_attendance: todayAttendance,
        attendance_trend: attendanceTrend,
        case_pipeline: casePipeline,
        case_disposition: caseDisposition,
    } = data;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-ink-muted">Real-time snapshot of your tehsil.</div>
                <LiveBadge dataUpdatedAt={dataUpdatedAt} />
            </div>

            {kpis.pending_newsletters > 0 && (
                <Link
                    to="/adlg/newsletters"
                    className="mb-4 flex items-center gap-3 rounded-xl border border-accent-400/40 bg-accent-100 px-4 py-3 text-sm font-semibold text-accent-600 transition hover:border-accent-500"
                >
                    <NewspaperIcon className="h-5 w-5 flex-shrink-0" />
                    {kpis.pending_newsletters} newsletter{kpis.pending_newsletters > 1 ? 's' : ''} awaiting your response
                    <span className="ml-auto text-xs underline">Respond →</span>
                </Link>
            )}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard icon={ScaleIcon} tone="accent" label="Active Cases" value={kpis.active_cases} sub={`${kpis.total_cases} total filed`} />
                <KpiCard
                    icon={FireIcon}
                    tone={kpis.urgent_cases > 0 ? 'danger' : 'primary'}
                    label="Urgent Cases"
                    value={kpis.urgent_cases}
                    sub="≤ 3 days remaining"
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
                        <SectionHeader title="Case Pipeline" subtitle="Where your tehsil's Divorce/Khula caseload currently sits" />
                        <HorizontalBarChart
                            data={casePipeline.map((s) => ({ label: s.label, value: s.count }))}
                            color={CHART_COLORS.primary}
                            emptyLabel="No Divorce/Khula cases filed yet."
                        />
                    </Card>

                    <Card className="p-5">
                        <SectionHeader title="Case Outcomes" subtitle="How your disposed Divorce/Khula cases resolved, all-time" />
                        <StackedBarChart
                            segments={caseDisposition.map((s) => ({ key: s.key, label: s.label, value: s.count, color: DISPOSITION_COLORS[s.key] }))}
                        />
                    </Card>

                    <div>
                        <SectionHeader
                            title="My Recent Activity"
                            action={
                                <Link to="/adlg/cases" className="text-xs font-semibold text-primary-600 hover:underline">
                                    Go to cases →
                                </Link>
                            }
                        />
                        <Card>
                            <ActivityTimeline events={recentAudit.slice(0, 8)} />
                        </Card>
                    </div>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <SectionHeader title="Attendance Trend" subtitle="% of your secretaries marked present, last 14 days" />
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

                    <div>
                        <SectionHeader title="Quick Actions" />
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
                                <Link
                                    to="/adlg/union-councils"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle"
                                >
                                    <MapPinIcon className="h-5 w-5 text-primary-500" />
                                    View Union Councils
                                </Link>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <SectionHeader title="AI Assistant" />
                <AdlgAiChat />
            </div>
        </div>
    );
}
