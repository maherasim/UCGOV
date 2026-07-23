import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorText, Field, TextInput } from '../components/ui';
import { APP_BASE_PATH } from '../utils/basePath';

const ROLE_HOME = {
    sa: '/admin/dashboard',
    adlg: '/adlg/dashboard',
    ddlg: '/ddlg/dashboard',
    sec: '/sec/dashboard',
};

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ login: '', password: '' });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const user = await login(form.login, form.password);
            const home = ROLE_HOME[user.role];
            if (!home) {
                setError('This role does not have a dashboard yet.');
                return;
            }
            navigate(home, { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid username/email or password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-primary-700 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
                <div className="mb-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface p-1.5 shadow-sm">
                        <img src={`${APP_BASE_PATH}/logo.png`} alt="Department Logo" className="h-full w-full object-contain" />
                    </div>
                    <h1 className="mt-3 text-lg font-bold text-ink">UC Governance Platform</h1>
                </div>

                <form onSubmit={handleSubmit}>
                    <Field label="Username or Email">
                        <TextInput
                            autoFocus
                            value={form.login}
                            onChange={(e) => setForm({ ...form, login: e.target.value })}
                            placeholder="sa@demo.pk"
                        />
                    </Field>
                    <Field label="Password">
                        <TextInput
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="••••••••"
                        />
                    </Field>
                    <ErrorText>{error}</ErrorText>
                    <Button type="submit" className="mt-2 w-full" disabled={submitting}>
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </Button>
                </form>
            </div>
            <p className="absolute inset-x-0 bottom-4 text-center text-[11px] text-white/50">
                © {new Date().getFullYear()} Bakhtawar Shahzad AI Labs Pvt Ltd. All rights reserved.
            </p>
        </div>
    );
}
