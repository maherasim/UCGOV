import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
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
} from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

const emptyForm = {
    union_council_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    cnic: '',
    phone: '',
    father_name: '',
};

function SecretaryFormModal({ open, onClose, secretary }) {
    const queryClient = useQueryClient();
    const isEdit = !!secretary;
    const [form, setForm] = useState(
        isEdit
            ? {
                  ...emptyForm,
                  union_council_id: secretary.secretary_profile?.union_council_id || '',
                  name: secretary.name || '',
                  username: secretary.username || '',
                  email: secretary.email || '',
                  cnic: formatCnic(secretary.cnic || ''),
                  phone: formatPhone(secretary.phone || ''),
                  father_name: secretary.secretary_profile?.father_name || '',
              }
            : emptyForm
    );
    const [error, setError] = useState('');

    const ucs = useQuery({
        queryKey: ['adlg-union-councils'],
        queryFn: () => client.get('/api/adlg/union-councils').then((r) => r.data.data),
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
                return client.put(`/api/adlg/secretaries/${secretary.id}`, payload);
            }
            return client.post('/api/adlg/secretaries', form);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-secretaries'] });
            queryClient.invalidateQueries({ queryKey: ['adlg-union-councils'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save secretary.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit Secretary' : 'Create Secretary'} subtitle="Secretary Union Council">
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
                <Field label="Union Council">
                    <Select value={form.union_council_id} onChange={set('union_council_id')} required>
                        <option value="">Select UC…</option>
                        {ucs.data?.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                                {u.secretary && u.id !== form.union_council_id ? ` (currently: ${u.secretary})` : ''}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Full Name">
                    <TextInput value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Father's Name">
                    <TextInput value={form.father_name} onChange={set('father_name')} />
                </Field>
                <Field label="Username">
                    <TextInput value={form.username} onChange={set('username')} placeholder="sec.uc45.burewala" required />
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

                <ErrorText>{error}</ErrorText>

                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Secretary'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Secretaries() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [toggleTarget, setToggleTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-secretaries'],
        queryFn: () => client.get('/api/adlg/secretaries').then((r) => r.data.data),
    });

    const toggleMutation = useMutation({
        mutationFn: () => client.patch(`/api/adlg/secretaries/${toggleTarget.id}/toggle-active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-secretaries'] });
            setToggleTarget(null);
        },
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Secretaries</h1>
                <Button onClick={() => setFormTarget({})}>+ Create Secretary</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username', render: (d) => `@${d}` },
                        { title: 'Union Council', data: 'secretary_profile.union_council', defaultContent: '—' },
                        { title: 'CNIC', data: 'cnic', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        2: (data, row) => (
                            <div className="flex items-center gap-1.5">
                                <span>{data || '—'}</span>
                                {row.secretary_profile?.geofence_set === false && (
                                    <span title="This Union Council has no geofence location set — attendance check-ins will always show outside geofence.">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                                    </span>
                                )}
                            </div>
                        ),
                        5: (data, row) => (
                            <button onClick={() => setToggleTarget(row)}>
                                <Badge tone={data ? 'success' : 'danger'}>{data ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        ),
                        6: (data, row) => (
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

            <SecretaryFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                secretary={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!toggleTarget}
                title={toggleTarget?.active ? 'Deactivate Secretary' : 'Reactivate Secretary'}
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
