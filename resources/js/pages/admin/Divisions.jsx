import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    TextInput,
} from '../../components/ui';

function DivisionFormModal({ open, onClose, division }) {
    const queryClient = useQueryClient();
    const [name, setName] = useState(division?.name || '');
    const [error, setError] = useState('');
    const isEdit = !!division;

    const close = () => {
        setName('');
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            isEdit
                ? client.put(`/api/admin/divisions/${division.id}`, { name: name.trim() })
                : client.post('/api/admin/divisions', { name: name.trim() }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save division.'),
    });

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit Division' : 'New Division'}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Division Name">
                    <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Multan" required autoFocus />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Division'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Divisions() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null); // null = closed, {} = create, {id,...} = edit
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['divisions'],
        queryFn: () => client.get('/api/admin/divisions').then((r) => r.data.data),
    });

    const deleteMutation = useMutation({
        mutationFn: () => client.delete(`/api/admin/divisions/${deleteTarget.id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['divisions'] });
            setDeleteTarget(null);
        },
        onError: (err) => setDeleteError(err.response?.data?.message || 'Could not delete division.'),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Divisions</h1>
                <Button onClick={() => setFormTarget({})}>+ New Division</Button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
                Step 1 of the geography hierarchy — Division → District → Tehsil.
            </p>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Division', data: 'name' },
                        { title: 'Districts', data: 'districts_count', render: (d) => `${d} district(s)` },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        2: (data, row) => (
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

            <DivisionFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                division={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Division"
                message={
                    deleteError ||
                    `Are you sure you want to delete "${deleteTarget?.name}"? This can't be undone.`
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
