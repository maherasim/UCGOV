import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FingerPrintIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Button, Card, ErrorText, Field, PasswordInput } from '../components/ui';

const ROLE_HOME = { sa: '/admin/dashboard', adlg: '/adlg/dashboard', sec: '/sec/dashboard' };

export default function FirstLoginSetup() {
    const { user, refresh } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [error, setError] = useState('');
    const [enrolling, setEnrolling] = useState(false);
    const [enrolled, setEnrolled] = useState(false);

    const mutation = useMutation({
        mutationFn: () => client.post('/api/profile/complete-first-login', { password, password_confirmation: confirmation }),
        onSuccess: async () => {
            await refresh();
            navigate(ROLE_HOME[user?.role] || '/login', { replace: true });
        },
        onError: (err) => {
            setError(err.response?.data?.message || 'Could not complete setup.');
            setEnrolling(false);
            setEnrolled(false);
        },
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
        setStep(2);
    };

    const runEnrollment = () => {
        setEnrolling(true);
        setTimeout(() => {
            setEnrolling(false);
            setEnrolled(true);
            setTimeout(() => mutation.mutate(), 700);
        }, 1800);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
            <Card className="w-full max-w-sm p-6">
                <div className="mb-5 flex items-center justify-center gap-2">
                    <div className={`h-1.5 w-10 rounded-full ${step >= 1 ? 'bg-primary-500' : 'bg-border'}`} />
                    <div className={`h-1.5 w-10 rounded-full ${step >= 2 ? 'bg-primary-500' : 'bg-border'}`} />
                </div>

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
                            <Button type="submit" className="mt-2 w-full">
                                Continue →
                            </Button>
                        </form>
                    </>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <h1 className="text-lg font-bold text-ink">Enroll Your Biometric</h1>
                        <p className="mb-6 mt-1 text-sm text-ink-muted">
                            Used to verify attendance check-ins. Tap below to enroll.
                        </p>

                        <button
                            type="button"
                            onClick={runEnrollment}
                            disabled={enrolling || enrolled || mutation.isPending}
                            className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition disabled:opacity-90 ${
                                enrolled ? 'bg-primary-500' : 'bg-primary-500 hover:bg-primary-600'
                            }`}
                        >
                            {enrolled ? <span className="text-4xl">✅</span> : <FingerPrintIcon className="h-10 w-10" />}
                        </button>

                        <div className="mt-5 flex gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className={`h-1.5 w-8 rounded-full ${enrolling || enrolled ? 'bg-primary-500' : 'bg-border'}`} />
                            ))}
                        </div>

                        <p className="mt-4 text-xs font-semibold text-ink-muted">
                            {mutation.isPending
                                ? 'Finishing setup…'
                                : enrolled
                                  ? 'Enrolled ✓'
                                  : enrolling
                                    ? 'Scanning…'
                                    : 'Tap to Enroll'}
                        </p>
                        <ErrorText>{error}</ErrorText>
                    </div>
                )}
            </Card>
        </div>
    );
}
