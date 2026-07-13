import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Button, Card, ErrorText, Field, Textarea } from '../../components/ui';

const emptyForm = { remarks: '', nikah_count: 0, birth_count: 0, death_count: 0, complaint_count: 0 };

function Counter({ label, value, onChange }) {
    return (
        <div className="rounded-lg border border-border p-3 text-center">
            <div className="mb-1.5 text-[10px] font-bold uppercase text-ink-muted">{label}</div>
            <div className="flex items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={() => onChange(Math.max(0, value - 1))}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-subtle text-ink hover:bg-border"
                >
                    −
                </button>
                <span className="w-6 text-lg font-bold text-ink">{value}</span>
                <button
                    type="button"
                    onClick={() => onChange(value + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100"
                >
                    +
                </button>
            </div>
        </div>
    );
}

export default function Reports() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['sec-reports'],
        queryFn: () => client.get('/api/sec/reports').then((r) => r.data.data),
    });

    const today = new Date().toISOString().slice(0, 10);
    const submittedToday = data?.some((r) => r.report_date === today);

    const mutation = useMutation({
        mutationFn: () => client.post('/api/sec/reports', form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-reports'] });
            setForm(emptyForm);
            setSuccess(true);
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit report.'),
    });

    if (isLoading) return null;

    return (
        <div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">Submit Daily Report</h2>
                    <Card className="p-5">
                        {submittedToday ? (
                            <div className="py-6 text-center">
                                <div className="text-3xl">✅</div>
                                <p className="mt-2 text-sm font-semibold text-ink">Today's report already submitted.</p>
                            </div>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    setSuccess(false);
                                    setError('');
                                    mutation.mutate();
                                }}
                            >
                                <div className="mb-4 grid grid-cols-2 gap-3">
                                    <Counter label="Nikah Reg." value={form.nikah_count} onChange={(v) => setForm({ ...form, nikah_count: v })} />
                                    <Counter label="Birth Certs" value={form.birth_count} onChange={(v) => setForm({ ...form, birth_count: v })} />
                                    <Counter label="Death Certs" value={form.death_count} onChange={(v) => setForm({ ...form, death_count: v })} />
                                    <Counter
                                        label="Complaints"
                                        value={form.complaint_count}
                                        onChange={(v) => setForm({ ...form, complaint_count: v })}
                                    />
                                </div>
                                <Field label="Daily Remarks">
                                    <Textarea
                                        value={form.remarks}
                                        onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                                        placeholder="Today's activities…"
                                        required
                                    />
                                </Field>
                                <ErrorText>{error}</ErrorText>
                                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                                    {mutation.isPending ? 'Submitting…' : 'Submit Report'}
                                </Button>
                            </form>
                        )}
                    </Card>
                </div>

                <div>
                    <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-muted">History</h2>
                    <Card>
                        {data.length === 0 ? (
                            <div className="p-6 text-center text-sm text-ink-muted">No reports submitted yet.</div>
                        ) : (
                            <ul className="max-h-[420px] divide-y divide-border overflow-y-auto">
                                {data.map((r) => (
                                    <li key={r.id} className="px-4 py-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold text-ink">{r.report_date}</span>
                                            <Badge tone={r.reviewed ? 'success' : 'warning'}>{r.reviewed ? 'Reviewed' : 'Pending'}</Badge>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{r.remarks}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
