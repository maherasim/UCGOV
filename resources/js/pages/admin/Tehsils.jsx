import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import {
    Badge,
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

function StepDots({ step }) {
    return (
        <div className="mb-5 flex items-center gap-2">
            {[1, 2, 3].map((n) => (
                <div key={n} className="flex flex-1 items-center gap-2">
                    <div
                        className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            n <= step ? 'bg-primary-500 text-white' : 'bg-surface-subtle text-ink-faint'
                        }`}
                    >
                        {n}
                    </div>
                    {n < 3 && <div className={`h-0.5 flex-1 ${n < step ? 'bg-primary-500' : 'bg-border'}`} />}
                </div>
            ))}
        </div>
    );
}

function TehsilFormModal({ open, onClose, tehsil }) {
    const queryClient = useQueryClient();
    const isEdit = !!tehsil;
    const [divisionId, setDivisionId] = useState(tehsil?.division_id || '');
    const [districtId, setDistrictId] = useState(tehsil?.district_id || '');
    const [tehsilName, setTehsilName] = useState(tehsil?.name || '');
    const [error, setError] = useState('');

    const divisions = useQuery({
        queryKey: ['divisions'],
        queryFn: () => client.get('/api/admin/divisions').then((r) => r.data.data),
        enabled: open,
    });

    const districts = useQuery({
        queryKey: ['districts', divisionId],
        queryFn: () => client.get('/api/admin/districts', { params: { division_id: divisionId } }).then((r) => r.data.data),
        enabled: open && !!divisionId,
    });

    const step = tehsilName || districtId ? 3 : divisionId ? 2 : 1;

    const reset = () => {
        setDivisionId('');
        setDistrictId('');
        setTehsilName('');
        setError('');
    };

    const close = () => {
        reset();
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const payload = { district_id: districtId, name: tehsilName.trim() };
            return isEdit
                ? client.put(`/api/admin/tehsils/${tehsil.id}`, payload)
                : client.post('/api/admin/tehsils', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tehsils'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save tehsil.'),
    });

    if (!isEdit && divisions.data?.length === 0) {
        return (
            <Modal open={open} onClose={close} title="New Tehsil">
                <div className="rounded-lg bg-accent-100 p-4 text-sm text-accent-600">
                    No divisions yet.{' '}
                    <Link to="/admin/divisions" className="font-semibold underline" onClick={close}>
                        Create one first
                    </Link>
                    , then add a district under it before creating a tehsil.
                </div>
            </Modal>
        );
    }

    // Edit mode: show every field at once (already have full context, no need to guide step-by-step)
    if (isEdit) {
        return (
            <Modal open={open} onClose={close} title="Edit Tehsil">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate();
                    }}
                >
                    <Field label="Division">
                        <Select
                            value={divisionId}
                            onChange={(e) => {
                                setDivisionId(e.target.value);
                                setDistrictId('');
                            }}
                            required
                        >
                            <option value="">Select division…</option>
                            {divisions.data?.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="District">
                        <Select value={districtId} onChange={(e) => setDistrictId(e.target.value)} required disabled={!divisionId}>
                            <option value="">Select district…</option>
                            {districts.data?.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Tehsil Name">
                        <TextInput value={tehsilName} onChange={(e) => setTehsilName(e.target.value)} required />
                    </Field>
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Saving…' : 'Save Changes'}
                    </Button>
                </form>
            </Modal>
        );
    }

    return (
        <Modal open={open} onClose={close} title="New Tehsil" subtitle={`Step ${step} of 3`}>
            <StepDots step={step} />
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Step 1 — Division">
                    <Select
                        value={divisionId}
                        onChange={(e) => {
                            setDivisionId(e.target.value);
                            setDistrictId('');
                        }}
                        required
                    >
                        <option value="">Select division…</option>
                        {divisions.data?.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </Select>
                </Field>

                {divisionId && (
                    <Field label="Step 2 — District">
                        {districts.data?.length === 0 ? (
                            <div className="rounded-lg bg-accent-100 p-3 text-xs text-accent-600">
                                No districts under this division yet.{' '}
                                <Link to="/admin/districts" className="font-semibold underline" onClick={close}>
                                    Create one first
                                </Link>
                                .
                            </div>
                        ) : (
                            <Select value={districtId} onChange={(e) => setDistrictId(e.target.value)} required>
                                <option value="">Select district…</option>
                                {districts.data?.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </Select>
                        )}
                    </Field>
                )}

                {divisionId && districtId && (
                    <Field label="Step 3 — Tehsil Name">
                        <TextInput
                            value={tehsilName}
                            onChange={(e) => setTehsilName(e.target.value)}
                            placeholder="e.g. Burewala"
                            required
                            autoFocus
                        />
                    </Field>
                )}

                <ErrorText>{error}</ErrorText>

                {divisionId && districtId && (
                    <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Creating…' : 'Create Tehsil'}
                    </Button>
                )}
            </form>
        </Modal>
    );
}

export default function Tehsils() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteError, setDeleteError] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['tehsils'],
        queryFn: () => client.get('/api/admin/tehsils', { params: { per_page: 200 } }).then((r) => r.data.data),
    });

    const deleteMutation = useMutation({
        mutationFn: () => client.delete(`/api/admin/tehsils/${deleteTarget.id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tehsils'] });
            setDeleteTarget(null);
        },
        onError: (err) => setDeleteError(err.response?.data?.message || 'Could not delete tehsil.'),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Tehsils</h1>
                <Button onClick={() => setFormTarget({})}>+ New Tehsil</Button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">Step 3 of the geography hierarchy — belongs to a District.</p>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Tehsil', data: 'name' },
                        { title: 'District', data: 'district' },
                        { title: 'Division', data: 'division' },
                        { title: 'Union Councils', data: 'union_councils_count' },
                        { title: 'ADLG', data: 'adlg_activated' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        3: (data) => <Badge tone="neutral">{data} UCs</Badge>,
                        4: (data) => <Badge tone={data ? 'success' : 'warning'}>{data ? 'Active' : 'None'}</Badge>,
                        5: (data, row) => (
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

            <TehsilFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                tehsil={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Tehsil"
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
