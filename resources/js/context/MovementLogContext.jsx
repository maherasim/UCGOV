import { createContext, useContext, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import { Button, ErrorText, Field, Modal, Select, Textarea } from '../components/ui';

export const MOVEMENT_REASONS = ['Field Visit', 'Tehsil Office Meeting', 'Court Hearing', 'Document Delivery', 'Other'];

const MovementLogContext = createContext(null);

/**
 * Single source of truth for the "log movement" modal — both the sidebar quick-action
 * (manual) and LiveLocationTracker's geofence-exit prompt (automatic) open the same
 * instance instead of each carrying its own duplicate modal + mutation.
 */
export function MovementLogProvider({ children }) {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [auto, setAuto] = useState(false);
    const [reason, setReason] = useState(MOVEMENT_REASONS[0]);
    const [details, setDetails] = useState('');
    const [error, setError] = useState('');

    const openMovementLog = (isAuto = false) => {
        setReason(MOVEMENT_REASONS[0]);
        setDetails('');
        setError('');
        setAuto(isAuto);
        setOpen(true);
    };

    const close = () => {
        setOpen(false);
        setAuto(false);
    };

    const mutation = useMutation({
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
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not log movement.'),
    });

    return (
        <MovementLogContext.Provider value={{ openMovementLog }}>
            {children}
            <Modal
                open={open}
                onClose={close}
                title={auto ? "You've left your UC" : 'Log Movement'}
                subtitle={auto ? 'Please log the reason for this movement' : 'Leaving UC premises during working hours'}
            >
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
        </MovementLogContext.Provider>
    );
}

export function useMovementLog() {
    const ctx = useContext(MovementLogContext);
    if (!ctx) throw new Error('useMovementLog must be used within a MovementLogProvider');
    return ctx;
}
