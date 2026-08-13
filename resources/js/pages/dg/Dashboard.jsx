import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    BuildingLibraryIcon,
    ClipboardDocumentListIcon,
    FingerPrintIcon,
    MapPinIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import { CHART_COLORS, TrendChart } from '../../components/charts';
import LiveBadge from '../../components/LiveBadge';
import SectionHeader from '../../components/SectionHeader';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

export default function Dashboard() {
    const { data, isLoading, dataUpdatedAt } = useQuery({
        queryKey: ['dg-dashboard'],
        queryFn: () => client.get('/api/dg/dashboard').then((r) => r.data),
        refetchInterval: 20000,
    });

    if (isLoading) return <FullScreenSpinner />;

    const { kpis, attendance_trend: attendanceTrend } = data;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-ink-muted">Real-time snapshot of your division.</div>
                <LiveBadge dataUpdatedAt={dataUpdatedAt} />
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard icon={MapPinIcon} tone="primary" label="Districts" value={kpis.districts} sub={`${kpis.tehsils} tehsils`} />
                <KpiCard icon={BuildingLibraryIcon} tone="info" label="Union Councils" value={kpis.union_councils} />
                <KpiCard icon={UserGroupIcon} tone="accent" label="Secretaries" value={kpis.secretaries} />
                <KpiCard
                    icon={FingerPrintIcon}
                    tone={kpis.attendance_rate_today >= 70 ? 'primary' : kpis.attendance_rate_today >= 40 ? 'accent' : 'danger'}
                    label="Today's Attendance"
                    value={`${kpis.attendance_rate_today}%`}
                    sub={`${kpis.attendance_marked_today} of ${kpis.secretaries} secretaries`}
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-5">
                        <SectionHeader title="Attendance Trend" subtitle="% of your division's secretaries marked present, last 14 days" />
                        <TrendChart
                            data={attendanceTrend}
                            height={220}
                            series={[{ key: 'rate', label: 'Attendance Rate', color: CHART_COLORS.primary, area: true }]}
                            valueFormatter={(v) => `${v}%`}
                            yTickFormatter={(v) => `${v}%`}
                        />
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-5">
                        <SectionHeader title="Reports" subtitle="Daily reports awaiting review across your division" />
                        <div className="text-3xl font-bold text-ink">{kpis.reports_pending_review}</div>
                        <p className="mt-1 text-xs text-ink-muted">pending review</p>
                    </Card>

                    <div>
                        <SectionHeader title="Quick Links" />
                        <Card className="p-3">
                            <div className="space-y-1">
                                <Link to="/dg/attendance" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle">
                                    <FingerPrintIcon className="h-5 w-5 text-primary-500" />
                                    View Attendance
                                </Link>
                                <Link to="/dg/reports" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink hover:bg-surface-subtle">
                                    <ClipboardDocumentListIcon className="h-5 w-5 text-primary-500" />
                                    View Daily Reports
                                </Link>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
