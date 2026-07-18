import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FingerPrintIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AvatarUpload } from '../../components/Avatar';
import { enrollFingerprint } from '../../utils/webauthn';
import { Button, Card, ErrorText, Field, PasswordInput } from '../../components/ui';

function FingerprintCard() {
    const queryClient = useQueryClient();
    const [error, setError] = useState('');

    const { data: passkeys, isLoading } = useQuery({
        queryKey: ['my-passkeys'],
        queryFn: () => client.get('/api/passkeys').then((r) => r.data.data),
    });

    const enrollMutation = useMutation({
        mutationFn: () => enrollFingerprint('Additional device'),
        onSuccess: () => {
            setError('');
            queryClient.invalidateQueries({ queryKey: ['my-passkeys'] });
        },
        onError: (err) => setError(err.message || 'Could not enroll fingerprint.'),
    });

    const removeMutation = useMutation({
        mutationFn: (id) => client.delete(`/api/passkeys/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-passkeys'] }),
    });

    return (
        <Card className="p-5">
            <h2 className="mb-1 text-sm font-bold text-ink">Fingerprint / Biometric</h2>
            <p className="mb-3 text-xs text-ink-muted">Used to verify your attendance check-ins.</p>

            {!isLoading && passkeys?.length > 0 && (
                <ul className="mb-3 divide-y divide-border rounded-lg border border-border">
                    {passkeys.map((p) => (
                        <li key={p.id} className="flex items-center justify-between px-3 py-2.5">
                            <div>
                                <div className="text-sm font-medium text-ink">{p.authenticator || p.name}</div>
                                <div className="text-xs text-ink-muted">
                                    Enrolled {new Date(p.created_at).toLocaleDateString()}
                                    {p.last_used_at ? ` · last used ${new Date(p.last_used_at).toLocaleDateString()}` : ''}
                                </div>
                            </div>
                            <button
                                onClick={() => removeMutation.mutate(p.id)}
                                disabled={removeMutation.isPending}
                                className="text-xs font-semibold text-danger hover:underline"
                            >
                                Remove
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!isLoading && passkeys?.length === 0 && (
                <p className="mb-3 rounded-lg border border-accent-400/40 bg-accent-100 px-3 py-2 text-xs font-medium text-accent-600">
                    No fingerprint enrolled — you won't be able to mark attendance until you enroll one.
                </p>
            )}

            <ErrorText>{error}</ErrorText>
            <Button variant="ghost" className="w-full" onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                <FingerPrintIcon className="h-4 w-4" />
                {enrollMutation.isPending ? 'Waiting for your fingerprint…' : 'Enroll New Device'}
            </Button>
        </Card>
    );
}

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

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="max-w-lg space-y-6">
            <h1 className="text-xl font-bold text-ink">Profile</h1>

            <Card className="p-5">
                <div className="flex items-center gap-4">
                    <AvatarUpload size="lg" />
                    <div>
                        <div className="text-base font-bold text-ink">{user?.name}</div>
                        <div className="text-sm text-ink-muted">Secretary Union Council</div>
                    </div>
                </div>
                <dl className="mt-4 divide-y divide-border border-t border-border text-sm">
                    <div className="flex justify-between py-2">
                        <dt className="text-ink-muted">Union Council</dt>
                        <dd className="font-medium text-ink">{user?.secretary_profile?.union_council || '—'}</dd>
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

            <FingerprintCard />

            <ChangePasswordCard />
        </div>
    );
}
