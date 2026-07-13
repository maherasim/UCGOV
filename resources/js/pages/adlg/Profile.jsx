import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { AvatarUpload } from '../../components/Avatar';
import { Button, Card, ErrorText, Field, PasswordInput } from '../../components/ui';

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
    );
}
