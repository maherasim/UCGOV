import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
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
    PasswordInput,
    Select,
    TextInput,
    UsernameTag,
} from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

const emptyForm = {
    division_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    cnic: '',
    phone: '',
    grade: '',
};

function DgFormModal({ open, onClose, dg }) {
    const queryClient = useQueryClient();
    const isEdit = !!dg;
    const [form, setForm] = useState(
        isEdit
            ? {
                  ...emptyForm,
                  division_id: dg.dg_profile?.division_id || '',
                  name: dg.name || '',
                  username: dg.username || '',
                  email: dg.email || '',
                  cnic: formatCnic(dg.cnic || ''),
                  phone: formatPhone(dg.phone || ''),
                  grade: dg.dg_profile?.grade || '',
              }
            : emptyForm
    );
    const [error, setError] = useState('');

    const divisions = useQuery({
        queryKey: ['divisions-picker'],
        queryFn: () => client.get('/api/admin/divisions').then((r) => r.data.data),
        enabled: open,
    });

    const close = () => {
        setForm(emptyForm);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            if (isEdit) {
                const { password, password_confirmation, ...payload } = form;
                return client.put(`/api/admin/dgs/${dg.id}`, payload);
            }
            return client.post('/api/admin/dgs', form);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dgs'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save DG.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit DG' : 'Create DG'} subtitle="Director Local Government">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!isEdit && form.password !== form.password_confirmation) {
                        setError('Passwords do not match.');
                        return;
                    }
                    mutation.mutate();
                }}
            >
                <Field label="Division">
                    <Select value={form.division_id} onChange={set('division_id')} required>
                        <option value="">Select division…</option>
                        {divisions.data?.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Full Name">
                    <TextInput value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Username">
                    <TextInput value={form.username} onChange={set('username')} placeholder="dg.multan" required />
                </Field>
                <Field label="Email (optional)">
                    <TextInput type="email" value={form.email} onChange={set('email')} />
                </Field>

                {!isEdit && (
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Password">
                            <PasswordInput value={form.password} onChange={set('password')} required />
                        </Field>
                        <Field label="Confirm Password">
                            <PasswordInput value={form.password_confirmation} onChange={set('password_confirmation')} required />
                        </Field>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Field label="CNIC">
                        <TextInput
                            value={form.cnic}
                            onChange={(e) => setForm({ ...form, cnic: formatCnic(e.target.value) })}
                            placeholder="36602-3534535-7"
                            inputMode="numeric"
                        />
                    </Field>
                    <Field label="Phone">
                        <TextInput
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                            placeholder="0300-1234567"
                            inputMode="numeric"
                        />
                    </Field>
                </div>
                <Field label="Grade">
                    <TextInput value={form.grade} onChange={set('grade')} placeholder="BPS-19" />
                </Field>

                <ErrorText>{error}</ErrorText>

                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create DG'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Dgs() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [toggleTarget, setToggleTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['dgs'],
        queryFn: () => client.get('/api/admin/dgs').then((r) => r.data.data),
    });

    const toggleMutation = useMutation({
        mutationFn: () => client.patch(`/api/admin/dgs/${toggleTarget.id}/toggle-active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dgs'] });
            setToggleTarget(null);
        },
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">DGs</h1>
                <Button onClick={() => setFormTarget({})}>+ Create DG</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username' },
                        { title: 'Division', data: 'dg_profile.division', defaultContent: '—' },
                        { title: 'Grade', data: 'dg_profile.grade', defaultContent: '—' },
                        { title: 'CNIC', data: 'cnic', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        1: (data) => <UsernameTag username={data} />,
                        6: (data, row) => (
                            <button onClick={() => setToggleTarget(row)}>
                                <Badge tone={data ? 'success' : 'danger'}>{data ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        ),
                        7: (data, row) => (
                            <div className="flex justify-end gap-1">
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

            <DgFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                dg={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!toggleTarget}
                title={toggleTarget?.active ? 'Deactivate DG' : 'Reactivate DG'}
                message={
                    toggleTarget?.active
                        ? `"${toggleTarget?.name}" will no longer be able to sign in. Their account and history are preserved and this can be reversed anytime.`
                        : `"${toggleTarget?.name}" will be able to sign in again.`
                }
                confirmLabel={toggleTarget?.active ? 'Deactivate' : 'Reactivate'}
                pending={toggleMutation.isPending}
                onCancel={() => setToggleTarget(null)}
                onConfirm={() => toggleMutation.mutate()}
            />
        </div>
    );
}
