import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { KeyIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AvatarUpload } from '../../components/Avatar';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorText,
    Field,
    Modal,
    Pagination,
    PasswordInput,
    Spinner,
    TextInput,
    UsernameTag,
} from '../../components/ui';
import { formatPhone } from '../../utils/format';

function ChangePasswordCard() {
    const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const mutation = useMutation({
        mutationFn: () => client.post('/api/profile/change-password', form),
        onSuccess: () => {
            setSuccess(true);
            setForm({ current_password: '', password: '', password_confirmation: '' });
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not change password.'),
    });

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    return (
        <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">Change Password</h2>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setSuccess(false);
                    setError('');
                    mutation.mutate();
                }}
            >
                <Field label="Current Password">
                    <PasswordInput value={form.current_password} onChange={set('current_password')} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="New Password">
                        <PasswordInput value={form.password} onChange={set('password')} required />
                    </Field>
                    <Field label="Confirm New Password">
                        <PasswordInput value={form.password_confirmation} onChange={set('password_confirmation')} required />
                    </Field>
                </div>
                <ErrorText>{error}</ErrorText>
                {success && <p className="mt-1 text-xs font-medium text-primary-600">✅ Password updated.</p>}
                <Button type="submit" variant="ghost" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Updating…' : 'Update Password'}
                </Button>
            </form>
        </Card>
    );
}

function ResetSecretaryPasswordModal({ secretary, onClose }) {
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
        <Modal open={!!secretary} onClose={close} title="Reset Secretary Password" subtitle={secretary?.name}>
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

function SecretaryPasswordSection() {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [resetTarget, setResetTarget] = useState(null);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['adlg-secretaries-paginated', search, page],
        queryFn: () =>
            client.get('/api/adlg/secretaries-paginated', { params: { search: search || undefined, page } }).then((r) => r.data),
        placeholderData: keepPreviousData,
    });

    const secretaries = data?.data || [];
    const meta = data?.meta;

    return (
        <Card className="overflow-hidden">
            <div className="border-b border-border p-5">
                <h2 className="text-sm font-bold text-ink">Reset Secretary Password</h2>
                <p className="mt-0.5 text-xs text-ink-muted">
                    Only secretaries belonging to your own tehsil are listed here{meta ? ` · ${meta.total} total` : ''}.
                </p>
                <div className="relative mt-3 max-w-sm">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <div className="[&_input]:pl-9">
                        <TextInput
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search name, username, CNIC, phone, UC…"
                        />
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Spinner className="h-8 w-8" />
                </div>
            ) : secretaries.length === 0 ? (
                <EmptyState icon="🧑‍💼" title="No secretaries match your search" />
            ) : (
                <>
                    <div className={`overflow-x-auto ${isFetching ? 'opacity-60' : ''}`}>
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-border bg-surface-subtle/60 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
                                <tr>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Username</th>
                                    <th className="px-4 py-3">Union Council</th>
                                    <th className="px-4 py-3">Phone</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {secretaries.map((sec) => (
                                    <tr key={sec.id} className="hover:bg-surface-subtle/60">
                                        <td className="px-4 py-3 font-medium text-ink">{sec.name}</td>
                                        <td className="px-4 py-3">
                                            <UsernameTag username={sec.username} />
                                        </td>
                                        <td className="px-4 py-3 text-ink-muted">{sec.secretary_profile?.union_council || '—'}</td>
                                        <td className="px-4 py-3 text-ink-muted">{sec.phone ? formatPhone(sec.phone) : '—'}</td>
                                        <td className="px-4 py-3">
                                            <Badge tone={sec.active ? 'success' : 'danger'}>{sec.active ? 'Active' : 'Inactive'}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setResetTarget(sec)}
                                                className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                                aria-label="Reset Password"
                                                title="Reset Password"
                                            >
                                                <KeyIcon className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination meta={meta} onPageChange={setPage} />
                </>
            )}

            <ResetSecretaryPasswordModal secretary={resetTarget} onClose={() => setResetTarget(null)} />
        </Card>
    );
}

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="max-w-4xl space-y-6">
            <h1 className="text-xl font-bold text-ink">Profile</h1>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="p-5">
                    <div className="flex items-center gap-4">
                        <AvatarUpload size="lg" />
                        <div>
                            <div className="text-base font-bold text-ink">{user?.name}</div>
                            <div className="text-sm text-ink-muted">Assistant Director Local Government</div>
                        </div>
                    </div>
                    <dl className="mt-4 divide-y divide-border border-t border-border text-sm">
                        <div className="flex justify-between py-2">
                            <dt className="text-ink-muted">Tehsil</dt>
                            <dd className="font-medium text-ink">{user?.adlg_profile?.tehsil || '—'}</dd>
                        </div>
                        <div className="flex justify-between py-2">
                            <dt className="text-ink-muted">Grade</dt>
                            <dd className="font-medium text-ink">{user?.adlg_profile?.grade || '—'}</dd>
                        </div>
                        <div className="flex justify-between py-2">
                            <dt className="text-ink-muted">Email</dt>
                            <dd className="font-medium text-ink">{user?.email || '—'}</dd>
                        </div>
                        <div className="flex justify-between py-2">
                            <dt className="text-ink-muted">Username</dt>
                            <dd className="font-medium text-ink">{user?.username}</dd>
                        </div>
                        <div className="flex justify-between py-2">
                            <dt className="text-ink-muted">Phone</dt>
                            <dd className="font-medium text-ink">{user?.phone || '—'}</dd>
                        </div>
                    </dl>
                    <Button variant="danger" className="mt-4" onClick={handleLogout}>
                        Sign Out
                    </Button>
                </Card>

                <ChangePasswordCard />
            </div>

            <SecretaryPasswordSection />
        </div>
    );
}
