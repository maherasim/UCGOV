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
} from '../../components/ui';
import { formatCnic, formatPhone } from '../../utils/format';

const emptyForm = {
    tehsil_id: '',
    name: '',
    username: '',
    email: '',
    password: '',
    password_confirmation: '',
    cnic: '',
    phone: '',
    grade: '',
};

function AdlgFormModal({ open, onClose, adlg }) {
    const queryClient = useQueryClient();
    const isEdit = !!adlg;
    const [form, setForm] = useState(
        isEdit
            ? {
                  ...emptyForm,
                  tehsil_id: adlg.adlg_profile?.tehsil_id || '',
                  name: adlg.name || '',
                  username: adlg.username || '',
                  email: adlg.email || '',
                  cnic: formatCnic(adlg.cnic || ''),
                  phone: formatPhone(adlg.phone || ''),
                  grade: adlg.adlg_profile?.grade || '',
              }
            : emptyForm
    );
    const [error, setError] = useState('');

    const tehsils = useQuery({
        queryKey: ['tehsils-picker'],
        queryFn: () => client.get('/api/admin/tehsils', { params: { per_page: 100 } }).then((r) => r.data.data),
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
                return client.put(`/api/admin/adlgs/${adlg.id}`, payload);
            }
            return client.post('/api/admin/adlgs', form);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlgs'] });
            queryClient.invalidateQueries({ queryKey: ['tehsils'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not save ADLG.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <Modal open={open} onClose={close} title={isEdit ? 'Edit ADLG' : 'Create ADLG'} subtitle="Assistant Director Local Government">
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
                <Field label="Tehsil">
                    <Select value={form.tehsil_id} onChange={set('tehsil_id')} required>
                        <option value="">Select tehsil…</option>
                        {tehsils.data?.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name} ({t.district})
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Full Name">
                    <TextInput value={form.name} onChange={set('name')} required />
                </Field>
                <Field label="Username">
                    <TextInput value={form.username} onChange={set('username')} placeholder="adlg.vehari" required />
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
                    <TextInput value={form.grade} onChange={set('grade')} placeholder="BPS-18" />
                </Field>

                <ErrorText>{error}</ErrorText>

                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create ADLG'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Adlgs() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [toggleTarget, setToggleTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlgs'],
        queryFn: () => client.get('/api/admin/adlgs').then((r) => r.data.data),
    });

    const toggleMutation = useMutation({
        mutationFn: () => client.patch(`/api/admin/adlgs/${toggleTarget.id}/toggle-active`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlgs'] });
            setToggleTarget(null);
        },
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">ADLGs</h1>
                <Button onClick={() => setFormTarget({})}>+ Create ADLG</Button>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Name', data: 'name' },
                        { title: 'Username', data: 'username', render: (d) => `@${d}` },
                        { title: 'Tehsil', data: 'adlg_profile.tehsil', defaultContent: '—' },
                        { title: 'Grade', data: 'adlg_profile.grade', defaultContent: '—' },
                        { title: 'CNIC', data: 'cnic', defaultContent: '—' },
                        { title: 'Phone', data: 'phone', defaultContent: '—' },
                        { title: 'Status', data: 'active' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
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

            <AdlgFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                adlg={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />

            <ConfirmDialog
                open={!!toggleTarget}
                title={toggleTarget?.active ? 'Deactivate ADLG' : 'Reactivate ADLG'}
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
