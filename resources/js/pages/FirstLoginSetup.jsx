import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, FingerPrintIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorText, Field, PasswordInput } from '../components/ui';
import { browserSupportsWebAuthn, enrollFingerprint } from '../utils/webauthn';

const ROLE_HOME = { sa: '/admin/dashboard', adlg: '/adlg/dashboard', ddlg: '/ddlg/dashboard', sec: '/sec/dashboard' };

export default function FirstLoginSetup() {
    const { user, refresh } = useAuth();
    const navigate = useNavigate();
    const needsBiometric = user?.role === 'sec';
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [enrolled, setEnrolled] = useState(false);

    const completeMutation = useMutation({
        mutationFn: () => client.post('/api/profile/complete-first-login', { password, password_confirmation: confirmation }),
        onSuccess: async () => {
            await refresh();
            navigate(ROLE_HOME[user?.role] || '/login', { replace: true });
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not complete setup.'),
    });

    const enrollMutation = useMutation({
        mutationFn: () => enrollFingerprint(`${user?.name}'s device`),
        onSuccess: () => {
            setEnrolled(true);
            setTimeout(() => completeMutation.mutate(), 500);
        },
        onError: (err) => setError(err.message || 'Could not enroll your fingerprint.'),
    });

    const submitPasswordStep = (e) => {
        e.preventDefault();
        setError('');
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmation) {
            setError('Passwords do not match.');
            return;
        }
        if (needsBiometric) {
            setStep(2);
        } else {
            completeMutation.mutate();
        }
    };

    const supported = browserSupportsWebAuthn();

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
            <Card className="w-full max-w-sm p-6">
                {needsBiometric && (
                    <div className="mb-5 flex items-center justify-center gap-2">
                        <div className={`h-1.5 w-10 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-border'}`} />
                        <div className={`h-1.5 w-10 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-border'}`} />
                    </div>
                )}

                {step === 1 ? (
                    <>
                        <h1 className="text-center text-lg font-bold text-ink">Welcome, {user?.name}</h1>
                        <p className="mb-5 text-center text-sm text-ink-muted">
                            This is your first login. Set a new password to continue.
                        </p>
                        <form onSubmit={submitPasswordStep}>
                            <Field label="New Password">
                                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus />
                            </Field>
                            <Field label="Confirm Password">
                                <PasswordInput value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required />
                            </Field>
                            <ErrorText>{error}</ErrorText>
                            <Button type="submit" className="mt-2 w-full" disabled={completeMutation.isPending}>
                                {completeMutation.isPending ? 'Finishing setup…' : needsBiometric ? 'Continue →' : 'Finish Setup'}
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-lg font-bold text-ink">Enroll Your Fingerprint</h1>
                        <p className="mb-6 mt-1 text-sm text-ink-muted">
                            Used to verify your attendance check-ins. Your device will prompt you for your fingerprint, Face ID, or
                            screen lock.
                        </p>

                        {!supported ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-danger">
                                This device or browser doesn't support fingerprint verification. Please open this page on a phone or
                                laptop with a fingerprint sensor, or contact your ADLG for help — or skip for now below.
                            </div>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError('');
                                        enrollMutation.mutate();
                                    }}
                                    disabled={enrollMutation.isPending || enrolled || completeMutation.isPending}
                                    className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-500 text-white shadow-lg transition hover:bg-primary-600 disabled:opacity-90"
                                >
                                    {enrolled ? <CheckIcon className="h-10 w-10" /> : <FingerPrintIcon className="h-10 w-10" />}
                                </button>

                                <p className="mt-4 text-xs font-semibold text-ink-muted">
                                    {completeMutation.isPending
                                        ? 'Finishing setup…'
                                        : enrolled
                                          ? 'Enrolled ✓'
                                          : enrollMutation.isPending
                                            ? 'Waiting for your fingerprint…'
                                            : 'Tap to Enroll'}
                                </p>
                            </>
                        )}
                        <ErrorText>{error}</ErrorText>

                        {!enrolled && (
                            <button
                                type="button"
                                onClick={() => {
                                    setError('');
                                    completeMutation.mutate();
                                }}
                                disabled={enrollMutation.isPending || completeMutation.isPending}
                                className="mt-5 text-xs font-semibold text-ink-muted underline decoration-dotted hover:text-ink disabled:opacity-60"
                            >
                                {completeMutation.isPending ? 'Finishing setup…' : 'Skip for now'}
                            </button>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
