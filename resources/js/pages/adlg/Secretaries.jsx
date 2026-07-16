import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExclamationTriangleIcon, IdentificationIcon, KeyIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
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

function ResetPasswordModal({ secretary, onClose }) {
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const close = () => {
        setPassword('');
        setConfirmation('');
        setError('');
        setSuccess(false);
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/adlg/secretaries/${secretary.id}/reset-password`, {
                password,
                password_confirmation: confirmation,
            }),
        onSuccess: () => setSuccess(true),
        onError: (err) => setError(err.response?.data?.message || 'Could not reset password.'),
    });

    return (
        <Modal open={!!secretary} onClose={close} title="Reset Password" subtitle={secretary?.name}>
            {success ? (
                <div className="rounded-lg bg-primary-50 p-4 text-sm font-medium text-primary-700">
                    ✅ Password updated. Share the new password with {secretary?.name} securely.
                </div>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate();
                    }}
                >
                    <Field label="New Password">
                        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Field>
                    <Field label="Confirm Password">
                        <PasswordInput value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
                    </Field>
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Resetting…' : 'Reset Password'}
                    </Button>
                </form>
            )}
        </Modal>
    );
}

function ChargesModal({ secretary, onClose }) {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState('');

    const ucs = useQuery({
        queryKey: ['adlg-union-councils'],
        queryFn: () => client.get('/api/adlg/union-councils').then((r) => r.data.data),
        enabled: !!secretary,
    });

    const assignMutation = useMutation({
        mutationFn: (unionCouncilId) => client.post(`/api/adlg/secretaries/${secretary.id}/charges`, { union_council_id: unionCouncilId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-secretaries'] });
            setSelected('');
        },
    });

    const removeMutation = useMutation({
        mutationFn: (unionCouncilId) => client.delete(`/api/adlg/secretaries/${secretary.id}/charges/${unionCouncilId}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adlg-secretaries'] }),
    });

    if (!secretary) return null;

    const charges = secretary.secretary_profile?.additional_charges || [];
    const chargedIds = new Set(charges.map((c) => c.union_council_id));
    const availableUcs = (ucs.data || []).filter(
        (u) => u.id !== secretary.secretary_profile?.union_council_id && !chargedIds.has(u.id)
    );

    return (
        <Modal
            open={!!secretary}
            onClose={onClose}
            title="Additional UC Charges"
            subtitle={`${secretary.name} · Primary: ${secretary.secretary_profile?.union_council || '—'}`}
        >
            <div className="mb-4">
                {charges.length === 0 ? (
                    <p className="py-4 text-center text-sm text-ink-muted">No additional charges assigned.</p>
                ) : (
                    <ul className="space-y-2">
                        {charges.map((c) => (
                            <li key={c.union_council_id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                                <span className="text-sm font-medium text-ink">{c.union_council}</span>
                                <button
                                    onClick={() => removeMutation.mutate(c.union_council_id)}
                                    disabled={removeMutation.isPending}
                                    className="text-xs font-semibold text-danger hover:underline"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Field label="Assign Additional UC">
                <div className="flex gap-2">
                    <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="flex-1">
                        <option value="">Select UC…</option>
                        {availableUcs.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                                {u.secretary ? ` (covered by ${u.secretary})` : ' (vacant)'}
                            </option>
                        ))}
                    </Select>
                    <Button
                        type="button"
                        disabled={!selected || assignMutation.isPending}
                        onClick={() => assignMutation.mutate(selected)}
                    >
                        Assign
                    </Button>
                </div>
            </Field>
            <ErrorText>{assignMutation.error?.response?.data?.message}</ErrorText>
            <p className="mt-2 text-xs text-ink-muted">
                When this secretary marks attendance at their primary UC, a covering remark is automatically logged for each
                additional-charge UC too.
            </p>
        </Modal>
    );
}

export default function Secretaries() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [toggleTarget, setToggleTarget] = useState(null);
    const [chargesTarget, setChargesTarget] = useState(null);
    const [resetTarget, setResetTarget] = useState(null);

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
                        { title: 'Username', data: 'username' },
                        { title: 'Union Council', data: 'secretary_profile.union_council', defaultContent: '—' },
                        { title: 'CNIC', data: 'cnic', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        1: (data) => <UsernameTag username={data} />,
                        2: (data, row) => (
                            <div className="flex items-center gap-1.5">
                                <span>{data || '—'}</span>
                                {row.secretary_profile?.geofence_set === false && (
                                    <span title="This Union Council has no geofence location set — attendance check-ins will always show outside geofence.">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" />
                                    </span>
                                )}
                                {row.secretary_profile?.additional_charges?.length > 0 && (
                                    <span title={`Additional charge: ${row.secretary_profile.additional_charges.map((c) => c.union_council).join(', ')}`}>
                                        <Badge tone="info">+{row.secretary_profile.additional_charges.length}</Badge>
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
                                    onClick={() => setChargesTarget(row.id)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Additional Charges"
                                    title="Additional UC Charges"
                                >
                                    <IdentificationIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setResetTarget(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Reset Password"
                                    title="Reset Password"
                                >
                                    <KeyIcon className="h-4 w-4" />
                                </button>
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

            <ChargesModal secretary={data.find((s) => s.id === chargesTarget)} onClose={() => setChargesTarget(null)} />

            <ResetPasswordModal secretary={resetTarget} onClose={() => setResetTarget(null)} />

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
