import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import LiveMap from '../../components/LiveMap';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, FullScreenSpinner } from '../../components/ui';

export default function Attendance() {
    useEffect(() => setLastModule('att'), []);

    const [tab, setTab] = useState('attendance');

    const attendance = useQuery({
        queryKey: ['adlg-attendance'],
        queryFn: () => client.get('/api/adlg/attendance').then((r) => r.data.data),
        enabled: tab === 'attendance',
    });
    const movement = useQuery({
        queryKey: ['adlg-movement-log'],
        queryFn: () => client.get('/api/adlg/movement-log').then((r) => r.data.data),
        enabled: tab === 'movement',
    });

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Attendance</h1>
                <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/adlg/attendance/analytics-export`, '_blank')}>
                    📥 Export Analytics
                </Button>
            </div>

            <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
                <button
                    onClick={() => setTab('attendance')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'attendance' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Attendance
                </button>
                <button
                    onClick={() => setTab('map')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'map' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Live Map
                </button>
                <button
                    onClick={() => setTab('movement')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'movement' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Movement Registry
                </button>
            </div>

            {tab === 'attendance' &&
                (attendance.isLoading ? (
                    <FullScreenSpinner />
                ) : (
                    <Card>
                        <DataTable
                            data={attendance.data}
                            columns={[
                                { title: 'Date', data: 'attendance_date' },
                                { title: 'Secretary', data: 'secretary' },
                                { title: 'UC', data: 'union_council' },
                                { title: 'Check-in', data: 'check_in_time' },
                                { title: 'Status', data: 'status' },
                                { title: 'Geofence', data: 'inside_geofence' },
                            ]}
                            slots={{
                                4: (data) => <Badge tone={data === 'present' ? 'success' : 'warning'}>{data}</Badge>,
                                5: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Inside' : 'Outside'}</Badge>,
                            }}
                        />
                    </Card>
                ))}

            {tab === 'map' && <LiveMap />}

            {tab === 'movement' &&
                (movement.isLoading ? (
                    <FullScreenSpinner />
                ) : (
                    <div>
                        <div className="mb-3 flex justify-end">
                            <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/adlg/movement-log/export`, '_blank')}>
                                📥 Export CSV
                            </Button>
                        </div>
                        <Card>
                            <DataTable
                                data={movement.data}
                                columns={[
                                    { title: 'Date', data: 'occurred_at' },
                                    { title: 'Secretary', data: 'secretary' },
                                    { title: 'UC', data: 'union_council' },
                                    { title: 'Reason', data: 'reason' },
                                    { title: 'Distance', data: 'distance_meters', render: (d) => `${d}m` },
                                ]}
                            />
                        </Card>
                    </div>
                ))}
        </div>
    );
}
