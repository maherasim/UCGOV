import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FingerPrintIcon, MapPinIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, ErrorText, Field, Modal, Select, Textarea } from '../../components/ui';

const MOVEMENT_REASONS = ['Field Visit', 'Tehsil Office Meeting', 'Court Hearing', 'Document Delivery', 'Other'];

function LogMovementModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const [reason, setReason] = useState(MOVEMENT_REASONS[0]);
    const [details, setDetails] = useState('');
    const [error, setError] = useState('');

    const close = () => {
        setReason(MOVEMENT_REASONS[0]);
        setDetails('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    resolve({ lat: null, lng: null });
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve({ lat: null, lng: null })
                );
            }).then(({ lat, lng }) => client.post('/api/sec/attendance/log-movement', { reason, details, lat, lng })),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-attendance'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not log movement.'),
    });

    return (
        <Modal open={open} onClose={close} title="Log Movement" subtitle="Leaving UC premises during working hours">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Reason">
                    <Select value={reason} onChange={(e) => setReason(e.target.value)}>
                        {MOVEMENT_REASONS.map((r) => (
                            <option key={r} value={r}>
                                {r}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Details (optional)">
                    <Textarea value={details} onChange={(e) => setDetails(e.target.value)} />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Logging…' : 'Log Movement'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Attendance() {
    useEffect(() => setLastModule('att'), []);

    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [movementOpen, setMovementOpen] = useState(false);
    const [markError, setMarkError] = useState('');
    const additionalCharges = user?.secretary_profile?.additional_charges || [];

    const { data, isLoading } = useQuery({
        queryKey: ['sec-attendance'],
        queryFn: () => client.get('/api/sec/attendance').then((r) => r.data.data),
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = data?.find((r) => r.attendance_date === today);

    const markMutation = useMutation({
        mutationFn: () =>
            new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    reject(new Error('Geolocation is not available in this browser.'));
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => reject(new Error('Could not get your location. Please enable location access.'))
                );
            }).then(({ lat, lng }) => client.post('/api/sec/attendance/mark-in', { lat, lng })),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sec-attendance'] }),
        onError: (err) => setMarkError(err.response?.data?.message || err.message || 'Could not mark attendance.'),
    });

    if (isLoading) return null;

    return (
        <div>
            {additionalCharges.length > 0 && (
                <div className="mb-4 rounded-xl border border-info/30 bg-blue-50 px-4 py-3 text-sm text-info">
                    <span className="font-semibold">📍 Additional charge:</span> you also cover{' '}
                    {additionalCharges.map((c) => c.union_council).join(', ')}. Marking attendance here auto-logs a covering remark
                    there too.
                </div>
            )}

            <div className="mb-6 flex flex-col items-center rounded-2xl border border-border bg-surface p-8 text-center">
                {todayRecord ? (
                    <>
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 text-3xl">✅</div>
                        <h2 className="mt-3 text-lg font-bold text-ink">Attendance Marked</h2>
                        <p className="text-sm text-ink-muted">
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-lg border border-border px-4 py-2">
                                <div className="text-[10px] font-bold uppercase text-ink-muted">Check-in</div>
                                <div className="text-sm font-semibold text-ink">{todayRecord.check_in_time?.slice(0, 5)}</div>
                            </div>
                            <div className="rounded-lg border border-border px-4 py-2">
                                <div className="text-[10px] font-bold uppercase text-ink-muted">Geofence</div>
                                <div className={`text-sm font-semibold ${todayRecord.inside_geofence ? 'text-primary-600' : 'text-danger'}`}>
                                    {todayRecord.inside_geofence ? '✓ Inside' : '⚠ Outside'}
                                </div>
                            </div>
                            <div className="rounded-lg border border-border px-4 py-2">
                                <div className="text-[10px] font-bold uppercase text-ink-muted">Status</div>
                                <div className="text-sm font-semibold text-ink capitalize">{todayRecord.status}</div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => markMutation.mutate()}
                            disabled={markMutation.isPending}
                            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition hover:bg-primary-600 disabled:opacity-60"
                        >
                            <FingerPrintIcon className="h-10 w-10" />
                        </button>
                        <h2 className="mt-4 text-lg font-bold text-ink">
                            {markMutation.isPending ? 'Marking attendance…' : 'Tap to Mark Attendance'}
                        </h2>
                        <p className="text-sm text-ink-muted">Uses your device location to confirm you're at the UC office.</p>
                        <ErrorText>{markError}</ErrorText>
                    </>
                )}

                <Button variant="ghost" className="mt-5 w-auto px-4" onClick={() => setMovementOpen(true)}>
                    <MapPinIcon className="h-4 w-4" /> Log Movement
                </Button>
            </div>

            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Attendance History</h2>
            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Date', data: 'attendance_date' },
                        { title: 'Check-in', data: 'check_in_time' },
                        { title: 'Status', data: 'status' },
                        { title: 'Geofence', data: 'inside_geofence' },
                    ]}
                    slots={{
                        2: (data) => <Badge tone={data === 'present' ? 'success' : 'warning'}>{data}</Badge>,
                        3: (data) => <Badge tone={data ? 'success' : 'danger'}>{data ? 'Inside' : 'Outside'}</Badge>,
                    }}
                />
            </Card>

            <LogMovementModal open={movementOpen} onClose={() => setMovementOpen(false)} />
        </div>
    );
}
