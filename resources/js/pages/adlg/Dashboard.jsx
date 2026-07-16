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
import PunjabLiveMap from '../../components/PunjabLiveMap';
import SectionHeader from '../../components/SectionHeader';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

const QUICK_ACTIONS = [
    { to: 'cases', label: 'Review Cases', icon: ScaleIcon },
    { to: 'union-councils', label: 'New Union Council', icon: PlusCircleIcon },
    { to: 'secretaries', label: 'Create Secretary', icon: UserPlusIcon },
];

const DISPOSITION_COLORS = {
    DISPOSED_RECONCILED: CHART_COLORS.primary,
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
        uc_map: ucMap,
    } = data;

    const ucMapStats = {
        total: ucMap.length,
        vacant: ucMap.filter((p) => p[2] === 0).length,
        covered: ucMap.filter((p) => p[2] >= 1).length,
        live: ucMap.filter((p) => p[2] === 2).length,
    };

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

            <Card className="mt-6 overflow-hidden p-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-bold text-ink">Tehsil, Live</h2>
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-500" />
                            </span>
                        </div>
                        <p className="text-xs text-ink-muted">Every geocoded Union Council in your tehsil, plotted by its real coordinates.</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-ink-muted">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.accent, boxShadow: `0 0 6px ${CHART_COLORS.accent}` }} />
                            {ucMapStats.live} checked in right now
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-ink-muted">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'rgba(11,109,58,0.7)' }} />
                            {ucMapStats.covered} covered
                        </span>
                        <span className="flex items-center gap-1.5 font-medium text-ink-muted">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'rgba(220,38,38,0.85)' }} />
                            {ucMapStats.vacant} vacant
                        </span>
                    </div>
                </div>
                <div style={{ height: 320 }}>
                    <PunjabLiveMap points={ucMap} />
                </div>
            </Card>

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
