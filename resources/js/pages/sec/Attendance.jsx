import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraIcon, FingerPrintIcon, XMarkIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { useAuth } from '../../context/AuthContext';
import { setLastModule } from '../../utils/lastModule';
import { compressPhoto } from '../../utils/photoCapture';
import { verifyFingerprint } from '../../utils/webauthn';
import { Badge, Button, Card, ErrorText } from '../../components/ui';

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not available in this browser.'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => reject(new Error('Could not get your location. Please enable location access.'))
        );
    });
}

export default function Attendance() {
    useEffect(() => setLastModule('att'), []);

    const queryClient = useQueryClient();
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [photoBlob, setPhotoBlob] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [markError, setMarkError] = useState('');
    const [markPhase, setMarkPhase] = useState('');
    const additionalCharges = user?.secretary_profile?.additional_charges || [];

    const { data, isLoading } = useQuery({
        queryKey: ['sec-attendance'],
        queryFn: () => client.get('/api/sec/attendance').then((r) => r.data.data),
    });

    const today = new Date().toISOString().slice(0, 10);
    const todayRecord = data?.find((r) => r.attendance_date === today);

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setMarkError('');
        try {
            const blob = await compressPhoto(file);
            setPhotoBlob(blob);
            setPhotoPreview(URL.createObjectURL(blob));
        } catch (err) {
            setMarkError(err.message || 'Could not process the photo.');
        }
    };

    const retakePhoto = () => {
        setPhotoBlob(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
    };

    const markMutation = useMutation({
        mutationFn: async () => {
            setMarkPhase('Getting your location…');
            const { lat, lng } = await getCurrentPosition();

            // Fingerprint is best-effort: every secretary enrolls once at first login,
            // but a failed/skipped/unsupported scan on any given day must never block
            // attendance — GPS + the selfie above are what's actually required.
            let credential = null;
            setMarkPhase('Waiting for your fingerprint…');
            try {
                credential = await verifyFingerprint();
            } catch {
                credential = null;
            }

            setMarkPhase('Marking attendance…');
            const form = new FormData();
            form.append('lat', lat);
            form.append('lng', lng);
            form.append('photo', photoBlob, 'selfie.jpg');
            if (credential) form.append('credential', JSON.stringify(credential));

            return client.post('/api/sec/attendance/mark-in', form);
        },
        onSuccess: () => {
            setMarkPhase('');
            retakePhoto();
            queryClient.invalidateQueries({ queryKey: ['sec-attendance'] });
        },
        onError: (err) => {
            setMarkPhase('');
            setMarkError(err.response?.data?.message || err.message || 'Could not mark attendance.');
        },
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
                        {todayRecord.photo_url && (
                            <img
                                src={todayRecord.photo_url}
                                alt="Today's check-in selfie"
                                className="mt-4 h-24 w-24 rounded-xl border border-border object-cover"
                            />
                        )}
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
                        <h2 className="text-lg font-bold text-ink">Mark Attendance</h2>
                        <p className="mb-4 text-sm text-ink-muted">Take a selfie, then confirm your location and fingerprint.</p>

                        <input ref={fileInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handlePhotoSelected} />

                        {photoPreview ? (
                            <div className="relative">
                                <img src={photoPreview} alt="Selfie preview" className="h-40 w-40 rounded-2xl border border-border object-cover" />
                                <button
                                    onClick={retakePhoto}
                                    disabled={markMutation.isPending}
                                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white shadow"
                                    aria-label="Retake photo"
                                >
                                    <XMarkIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-ink-muted transition hover:border-primary-400 hover:text-primary-600"
                            >
                                <CameraIcon className="h-10 w-10" />
                                <span className="text-xs font-semibold">Take Selfie</span>
                            </button>
                        )}

                        {photoPreview && (
                            <Button
                                className="mt-5"
                                onClick={() => markMutation.mutate()}
                                disabled={markMutation.isPending}
                            >
                                <FingerPrintIcon className="h-4 w-4" />
                                {markMutation.isPending ? markPhase || 'Marking attendance…' : 'Confirm & Mark Attendance'}
                            </Button>
                        )}
                        <ErrorText>{markError}</ErrorText>
                    </>
                )}
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
        </div>
    );
}
