import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AvatarUpload } from '../../components/Avatar';
import { Button, Card, ErrorText, Field, Modal, TextInput, UsernameTag } from '../../components/ui';

function ResetPasswordModal({ target, onClose }) {
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
            client.post(`/api/admin/users/${target.id}/reset-password`, {
                password,
                password_confirmation: confirmation,
            }),
        onSuccess: () => setSuccess(true),
        onError: (err) => setError(err.response?.data?.message || 'Could not reset password.'),
    });

    return (
        <Modal open={!!target} onClose={close} title="Reset Password" subtitle={target?.name}>
            {success ? (
                <div className="rounded-lg bg-primary-50 p-4 text-sm font-medium text-primary-700">
                    ✅ Password updated. Share the new password with {target?.name} securely.
                </div>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        mutation.mutate();
                    }}
                >
                    <Field label="New Password">
                        <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </Field>
                    <Field label="Confirm Password">
                        <TextInput
                            type="password"
                            value={confirmation}
                            onChange={(e) => setConfirmation(e.target.value)}
                            required
                        />
                    </Field>
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                        {mutation.isPending ? 'Updating…' : 'Update Password'}
                    </Button>
                </form>
            )}
        </Modal>
    );
}

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [resetTarget, setResetTarget] = useState(null);

    const { data: adlgs } = useQuery({
        queryKey: ['adlgs'],
        queryFn: () => client.get('/api/admin/adlgs').then((r) => r.data.data),
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="max-w-2xl">
            <h1 className="mb-4 text-xl font-bold text-ink">Profile</h1>

            <Card className="mb-6 p-5">
                <div className="flex items-center gap-4">
                    <AvatarUpload size="lg" />
                    <div>
                        <div className="text-base font-bold text-ink">{user?.name}</div>
                        <div className="text-sm text-ink-muted">Super Administrator</div>
                    </div>
                </div>
                <dl className="mt-4 divide-y divide-border border-t border-border text-sm">
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

            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">
                Credential Management
            </h2>
            <p className="mb-3 text-sm text-ink-muted">Only the Super Admin can change user passwords.</p>
            <Card>
                <ul className="divide-y divide-border">
                    {adlgs?.map((u) => (
                        <li key={u.id} className="flex items-center justify-between px-4 py-3">
                            <div>
                                <div className="text-sm font-medium text-ink">{u.name}</div>
                                <div className="text-xs text-ink-muted">
                                    <UsernameTag username={u.username} />
                                </div>
                            </div>
                            <Button variant="ghost" onClick={() => setResetTarget(u)}>
                                🔒 Reset Password
                            </Button>
                        </li>
                    ))}
                    {adlgs?.length === 0 && (
                        <li className="px-4 py-6 text-center text-sm text-ink-muted">No ADLG accounts yet.</li>
                    )}
                </ul>
            </Card>

            <ResetPasswordModal target={resetTarget} onClose={() => setResetTarget(null)} />
        </div>
    );
}
