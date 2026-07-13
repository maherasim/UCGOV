import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Card, FullScreenSpinner } from '../../components/ui';

export default function Attendance() {
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
            <h1 className="mb-4 text-xl font-bold text-ink">Attendance</h1>

            <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
                <button
                    onClick={() => setTab('attendance')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'attendance' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Attendance
                </button>
                <button
                    onClick={() => setTab('movement')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'movement' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Movement Registry
                </button>
            </div>

            {tab === 'attendance' ? (
                attendance.isLoading ? (
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
                )
            ) : movement.isLoading ? (
                <FullScreenSpinner />
            ) : (
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
            )}
        </div>
    );
}
