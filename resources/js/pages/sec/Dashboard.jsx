import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FingerPrintIcon, ClipboardDocumentListIcon, ScaleIcon, ClockIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { Card, FullScreenSpinner, KpiCard } from '../../components/ui';

export default function Dashboard() {
    const attendance = useQuery({
        queryKey: ['sec-attendance'],
        queryFn: () => client.get('/api/sec/attendance').then((r) => r.data.data),
    });
    const reports = useQuery({
        queryKey: ['sec-reports'],
        queryFn: () => client.get('/api/sec/reports').then((r) => r.data.data),
    });
    const cases = useQuery({
        queryKey: ['sec-cases', ''],
        queryFn: () => client.get('/api/sec/cases').then((r) => r.data.data),
    });

    if (attendance.isLoading || reports.isLoading || cases.isLoading) return <FullScreenSpinner />;

    const today = new Date().toISOString().slice(0, 10);
    const attendedToday = attendance.data.some((r) => r.attendance_date === today);
    const reportedToday = reports.data.some((r) => r.report_date === today);
    const activeCases = cases.data.filter((c) => !['DISPOSED_RECONCILED', 'DISPOSED_EFFECTIVE', 'FILED_NON_RESPONSE'].includes(c.status));
    const readyForArbitration = cases.data.filter((c) => c.status === 'NOTICE_ISSUED').length;

    return (
        <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <KpiCard
                    icon={FingerPrintIcon}
                    tone={attendedToday ? 'primary' : 'danger'}
                    label="Today's Attendance"
                    value={attendedToday ? 'Marked' : 'Pending'}
                />
                <KpiCard
                    icon={ClipboardDocumentListIcon}
                    tone={reportedToday ? 'primary' : 'accent'}
                    label="Today's Report"
                    value={reportedToday ? 'Submitted' : 'Pending'}
                />
                <KpiCard icon={ScaleIcon} tone="info" label="Active Cases" value={activeCases.length} />
                <KpiCard
                    icon={ClockIcon}
                    tone={readyForArbitration > 0 ? 'accent' : 'primary'}
                    label="Ready for Arbitration"
                    value={readyForArbitration}
                    sub="Notice issued"
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {!attendedToday && (
                    <Link to="/sec/attendance">
                        <Card className="flex items-center gap-3 p-4 hover:bg-primary-50">
                            <FingerPrintIcon className="h-6 w-6 text-primary-500" />
                            <div>
                                <div className="text-sm font-semibold text-ink">Mark today's attendance</div>
                                <div className="text-xs text-ink-muted">Tap to check in with geofence verification</div>
                            </div>
                        </Card>
                    </Link>
                )}
                {!reportedToday && (
                    <Link to="/sec/reports">
                        <Card className="flex items-center gap-3 p-4 hover:bg-primary-50">
                            <ClipboardDocumentListIcon className="h-6 w-6 text-primary-500" />
                            <div>
                                <div className="text-sm font-semibold text-ink">Submit today's report</div>
                                <div className="text-xs text-ink-muted">Daily remarks and activity counters</div>
                            </div>
                        </Card>
                    </Link>
                )}
            </div>
        </div>
    );
}
