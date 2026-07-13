import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Button, Card, ErrorText, Field, Modal, TextInput } from '../../components/ui';

const emptyForm = { name: '', uc_no: '', code: '', address: '', lat: '', lng: '', geofence_radius: 150 };

function UnionCouncilFormModal({ open, onClose, uc }) {
    const queryClient = useQueryClient();
    const isEdit = !!uc;
    const [form, setForm] = useState(
        isEdit
            ? {
                  name: uc.name || '',
                  uc_no: uc.uc_no ?? '',
                  code: uc.code || '',
                  address: uc.address || '',
                  lat: uc.lat ?? '',
                  lng: uc.lng ?? '',
                  geofence_radius: uc.geofence_radius ?? 150,
              }
            : emptyForm
    );
    const [error, setError] = useState('');

    const close = () => {
        setForm(emptyForm);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            isEdit
                ? client.put(`/api/adlg/union-councils/${uc.id}`, form)
                : client.post('/api/adlg/union-councils', form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-union-councils'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save union council.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const pinMyLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not available in this browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => setForm({ ...form, lat: pos.coords.latitude.toFixed(5), lng: pos.coords.longitude.toFixed(5) }),
            () => setError('Could not get your location.')
        );
    };

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit Union Council' : 'New Union Council'}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="UC Name">
                    <TextInput value={form.name} onChange={set('name')} required autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="UC No.">
                        <TextInput type="number" value={form.uc_no} onChange={set('uc_no')} />
                    </Field>
                    <Field label="Code">
                        <TextInput value={form.code} onChange={set('code')} />
                    </Field>
                </div>
                <Field label="Address">
                    <TextInput value={form.address} onChange={set('address')} />
                </Field>

                <Field label="Geofence">
                    <div className="grid grid-cols-3 gap-3">
                        <TextInput placeholder="Latitude" value={form.lat} onChange={set('lat')} />
                        <TextInput placeholder="Longitude" value={form.lng} onChange={set('lng')} />
                        <TextInput placeholder="Radius (m)" type="number" value={form.geofence_radius} onChange={set('geofence_radius')} />
                    </div>
                    <button
                        type="button"
                        onClick={pinMyLocation}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary-600"
                    >
                        <MapPinIcon className="h-3.5 w-3.5" /> Pin my current location
                    </button>
                </Field>

                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create UC'}
                </Button>
            </form>
        </Modal>
    );
}

export default function UnionCouncils() {
    const [formTarget, setFormTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-union-councils'],
        queryFn: () => client.get('/api/adlg/union-councils').then((r) => r.data.data),
    });

    if (isLoading) return null;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Union Councils</h1>
                <Button onClick={() => setFormTarget({})}>+ New Union Council</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'UC No.', data: 'uc_no', defaultContent: '—' },
                        { title: 'Name', data: 'name' },
                        { title: 'Secretary', data: 'secretary' },
                        { title: 'Geofence', data: 'lat' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        2: (data) => (data ? data : <Badge tone="warning">Vacant</Badge>),
                        3: (data, row) =>
                            row.lat && row.lng ? (
                                <Badge tone="success">Set · {row.geofence_radius}m</Badge>
                            ) : (
                                <Badge tone="neutral">Not set</Badge>
                            ),
                        4: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setFormTarget(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Edit"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <UnionCouncilFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                uc={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />
        </div>
    );
}
