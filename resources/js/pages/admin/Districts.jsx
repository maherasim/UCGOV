import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import {
    Button,
    Card,
    ConfirmDialog,
    ErrorText,
    Field,
    FullScreenSpinner,
    Modal,
    Select,
    TextInput,
} from '../../components/ui';

function DistrictFormModal({ open, onClose, district }) {
    const queryClient = useQueryClient();
    const [divisionId, setDivisionId] = useState(district?.division_id || '');
    const [name, setName] = useState(district?.name || '');
    const [error, setError] = useState('');
    const isEdit = !!district;

    const divisions = useQuery({
        queryKey: ['divisions'],
        queryFn: () => client.get('/api/admin/divisions').then((r) => r.data.data),
        enabled: open,
    });

    const close = () => {
        setDivisionId('');
        setName('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const payload = { division_id: divisionId, name: name.trim() };
            return isEdit
                ? client.put(`/api/admin/districts/${district.id}`, payload)
                : client.post('/api/admin/districts', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['districts'] });
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save district.'),
    });

    if (divisions.data?.length === 0) {
        return (
            <Modal open={open} onClose={close} title={isEdit ? 'Edit District' : 'New District'}>
                <div className="rounded-lg bg-accent-100 p-4 text-sm text-accent-600">
                    No divisions yet.{' '}
                    <Link to="/admin/divisions" className="font-semibold underline" onClick={close}>
                        Create one first
                    </Link>
                    .
                </div>
            </Modal>
        );
    }

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit District' : 'New District'} subtitle="Step 2: choose the parent division">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Division">
                    <Select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} required>
                        <option value="">Select division…</option>
                        {divisions.data?.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="District Name">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vehari" required />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create District'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Districts() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['districts'],
        queryFn: () => client.get('/api/admin/districts').then((r) => r.data.data),
    });

    const deleteMutation = useMutation({
        mutationFn: () => client.delete(`/api/admin/districts/${deleteTarget.id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['districts'] });
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            setDeleteTarget(null);
        },
        onError: (err) => setDeleteError(err.response?.data?.message || 'Could not delete district.'),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Districts</h1>
                <Button onClick={() => setFormTarget({})}>+ New District</Button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">Step 2 of the geography hierarchy — belongs to a Division.</p>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'District', data: 'name' },
                        { title: 'Division', data: 'division' },
                        { title: 'Tehsils', data: 'tehsils_count', render: (d) => `${d} tehsil(s)` },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        3: (data, row) => (
                            <div className="flex justify-end gap-1">
                                <button
                                    onClick={() => setFormTarget(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Edit"
                                >
                                    <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setDeleteError('');
                                        setDeleteTarget(row);
                                    }}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-red-50 hover:text-danger"
                                    aria-label="Delete"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <DistrictFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                district={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete District"
                message={
                    deleteError || `Are you sure you want to delete "${deleteTarget?.name}"? This can't be undone.`
                }
                pending={deleteMutation.isPending}
                onCancel={() => {
                    setDeleteTarget(null);
                    setDeleteError('');
                }}
                onConfirm={() => deleteMutation.mutate()}
            />
        </div>
    );
}
