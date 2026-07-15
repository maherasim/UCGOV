import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { Button, ErrorText, Field, Modal, Select, Textarea } from './ui';

const MOVEMENT_REASONS = ['Field Visit', 'Tehsil Office Meeting', 'Court Hearing', 'Document Delivery', 'Other'];
const PING_INTERVAL_MS = 45000;

function isWorkingHours() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return day >= 0 && day <= 4 && hour >= 9 && hour < 17; // Sun–Thu 9AM–5PM
}

/**
 * Mounted once at the Secretary layout level (not the Attendance page) so it keeps running
 * no matter which tab the secretary is on — mirrors the prototype's initSEC() wiring, which
 * starts watchPosition at login, not when the Attendance tab is opened.
 */
export default function LiveLocationTracker() {
    const queryClient = useQueryClient();
    const watchIdRef = useRef(null);
    const lastPingRef = useRef(0);
    const promptedRef = useRef(false);
    const [movementOpen, setMovementOpen] = useState(false);
    const [reason, setReason] = useState(MOVEMENT_REASONS[0]);
    const [details, setDetails] = useState('');
    const [error, setError] = useState('');

    const pingMutation = useMutation({
        mutationFn: ({ lat, lng, accuracy }) => client.post('/api/sec/attendance/live-location', { lat, lng, accuracy }),
        onSuccess: ({ data }) => {
            if (data.inside_geofence === false) {
                if (!promptedRef.current) {
                    promptedRef.current = true;
                    setMovementOpen(true);
                }
            } else {
                promptedRef.current = false;
            }
        },
    });

    useEffect(() => {
        if (!navigator.geolocation || !isWorkingHours()) return undefined;

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const now = Date.now();
                if (now - lastPingRef.current < PING_INTERVAL_MS) return;
                lastPingRef.current = now;
                pingMutation.mutate({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
            },
            () => {},
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeModal = () => {
        setReason(MOVEMENT_REASONS[0]);
        setDetails('');
        setError('');
        setMovementOpen(false);
    };

    const submitMutation = useMutation({
        mutationFn: () =>
            new Promise((resolve) => {
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
            closeModal();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not log movement.'),
    });

    return (
        <Modal open={movementOpen} onClose={closeModal} title="You've left your UC" subtitle="Please log the reason for this movement">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    submitMutation.mutate();
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
                <Button type="submit" className="mt-2 w-full" disabled={submitMutation.isPending}>
                    {submitMutation.isPending ? 'Logging…' : 'Log Movement'}
                </Button>
            </form>
        </Modal>
    );
}
