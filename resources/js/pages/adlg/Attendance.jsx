import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    UserGroupIcon,
    CalendarDaysIcon,
    BuildingLibraryIcon,
    FunnelIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import LiveMap from '../../components/LiveMap';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, FullScreenSpinner, KpiCard, Modal, Select, TextInput } from '../../components/ui';

const emptyFilters = { union_council_id: '', from: '', to: '' };

function PhotoModal({ url, onClose }) {
    return (
        <Modal open={!!url} onClose={onClose} title="Check-in Selfie">
            {url && <img src={url} alt="Check-in selfie" className="w-full rounded-xl border border-border object-cover" />}
        </Modal>
    );
}

export default function Attendance() {
    useEffect(() => setLastModule('att'), []);

    const [tab, setTab] = useState('attendance');
    const [filters, setFilters] = useState(emptyFilters);
    const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
    const [photoUrl, setPhotoUrl] = useState(null);

    const ucs = useQuery({
        queryKey: ['adlg-union-councils'],
        queryFn: () => client.get('/api/adlg/union-councils').then((r) => r.data.data),
    });

    const attendance = useQuery({
        queryKey: ['adlg-attendance', appliedFilters],
        queryFn: () =>
            client
                .get('/api/adlg/attendance', {
                    params: {
                        union_council_id: appliedFilters.union_council_id || undefined,
                        from: appliedFilters.from || undefined,
                        to: appliedFilters.to || undefined,
                    },
                })
                .then((r) => r.data),
        enabled: tab === 'attendance',
    });

    const movement = useQuery({
        queryKey: ['adlg-movement-log'],
        queryFn: () => client.get('/api/adlg/movement-log').then((r) => r.data.data),
        enabled: tab === 'movement',
    });

    const records = attendance.data?.data || [];
    const meta = attendance.data?.meta;

    const exportUrl = () => {
        const params = new URLSearchParams();
        if (appliedFilters.union_council_id) params.set('union_council_id', appliedFilters.union_council_id);
        if (appliedFilters.from) params.set('from', appliedFilters.from);
        if (appliedFilters.to) params.set('to', appliedFilters.to);
        const qs = params.toString();
        return `${APP_BASE_PATH}/api/adlg/attendance/analytics-export${qs ? `?${qs}` : ''}`;
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Attendance</h1>
                <Button variant="ghost" onClick={() => window.open(exportUrl(), '_blank')}>
                    📊 Export Excel
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

            {tab === 'attendance' && (
                <>
                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <KpiCard icon={UserGroupIcon} tone="primary" label="Total Records" value={meta?.total ?? '—'} />
                        <KpiCard icon={CalendarDaysIcon} tone="accent" label="Today" value={meta?.today ?? '—'} />
                        <KpiCard icon={BuildingLibraryIcon} tone="info" label="Union Councils" value={meta?.union_councils ?? '—'} />
                        <KpiCard icon={FunnelIcon} tone="primary" label="Filtered" value={meta?.filtered ?? '—'} sub="Matching current filters" />
                    </div>

                    <Card className="mb-4 p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="w-48">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Union Council</label>
                                <Select value={filters.union_council_id} onChange={(e) => setFilters({ ...filters, union_council_id: e.target.value })}>
                                    <option value="">All UCs</option>
                                    {ucs.data?.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.uc_no ? `${u.uc_no} · ` : ''}
                                            {u.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div className="w-40">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">From</label>
                                <TextInput type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
                            </div>
                            <div className="w-40">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">To</label>
                                <TextInput type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
                            </div>
                            <Button onClick={() => setAppliedFilters(filters)}>Apply</Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setFilters(emptyFilters);
                                    setAppliedFilters(emptyFilters);
                                }}
                            >
                                Clear
                            </Button>
                        </div>
                    </Card>

                    {attendance.isLoading ? (
                        <FullScreenSpinner />
                    ) : (
                        <Card>
                            <DataTable
                                data={records}
                                columns={[
                                    { title: 'Date', data: 'attendance_date' },
                                    { title: 'Secretary', data: 'secretary' },
                                    { title: 'UC', data: 'union_council' },
                                    { title: 'Check-in', data: 'check_in_time' },
                                    { title: 'Status', data: 'status' },
                                    { title: 'Geofence', data: 'inside_geofence' },
                                    { title: 'Fingerprint', data: 'biometric_verified' },
                                    { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                                ]}
                                slots={{
                                    4: (data) => <Badge tone={data === 'present' ? 'success' : 'warning'}>{data}</Badge>,
                                    5: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Inside' : 'Outside'}</Badge>,
                                    6: (data) => <Badge tone={data ? 'success' : 'neutral'}>{data ? 'Verified' : 'Not verified'}</Badge>,
                                    7: (data, row) => (
                                        <div className="flex justify-end gap-1">
                                            {row.photo_url && (
                                                <button
                                                    onClick={() => setPhotoUrl(row.photo_url)}
                                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                                    title="View Selfie"
                                                >
                                                    📷
                                                </button>
                                            )}
                                            {row.lat && row.lng && (
                                                <a
                                                    href={`https://maps.google.com/?q=${row.lat},${row.lng}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                                    title="View on Map"
                                                >
                                                    <MapPinIcon className="h-4 w-4" />
                                                </a>
                                            )}
                                        </div>
                                    ),
                                }}
                            />
                        </Card>
                    )}
                </>
            )}

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

            <PhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />
        </div>
    );
}
