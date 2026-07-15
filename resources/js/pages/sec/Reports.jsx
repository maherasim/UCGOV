import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, EmptyState, ErrorText, Field, FileInput, FullScreenSpinner, Modal, TextInput, Textarea } from '../../components/ui';

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

function FillPerformaForm({ performa, onClose }) {
    const queryClient = useQueryClient();
    const initialValues = () => {
        const vals = {};
        performa.fields.forEach((f) => {
            const existing = performa.my_response?.values.find((v) => v.field_id === f.id);
            vals[f.id] = existing?.value || '';
        });
        return vals;
    };
    const [values, setValues] = useState(initialValues);
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => client.post(`/api/sec/performas/${performa.id}/respond-form`, { values }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-performas'] });
            setError('');
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit response.'),
    });

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
            }}
        >
            {performa.fields.map((f) => (
                <Field key={f.id} label={f.label}>
                    <TextInput
                        type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                        value={values[f.id] || ''}
                        onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
                        placeholder={`Enter ${f.label}`}
                    />
                </Field>
            ))}
            <ErrorText>{error}</ErrorText>
            <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                {mutation.isPending ? 'Submitting…' : 'Submit Response →'}
            </Button>
        </form>
    );
}

function FillPerformaModal({ performa, onClose }) {
    return (
        <Modal open={!!performa} onClose={onClose} title={performa?.title} subtitle="Your answers appear live in ADLG's portal">
            {performa && <FillPerformaForm key={performa.id} performa={performa} onClose={onClose} />}
        </Modal>
    );
}

function UploadPerformaModal({ performa, onClose }) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setFile(null);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('file', file);
            return client.post(`/api/sec/performas/${performa.id}/respond-excel`, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-performas'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not upload file.'),
    });

    return (
        <Modal open={!!performa} onClose={close} title={performa?.title} subtitle="Attach completed file and submit to ADLG">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                {performa?.has_template && (
                    <a
                        href={`${APP_BASE_PATH}/api/sec/performas/${performa.id}/template`}
                        target="_blank"
                        rel="noopener"
                        className="mb-3 block text-xs font-semibold text-primary-600 hover:underline"
                    >
                        📥 Download blank template
                    </a>
                )}
                <Field label="Filled File">
                    <FileInput value={file} onChange={setFile} accept=".xlsx,.xls,.csv,.pdf" hint="Excel · PDF · Scanned copy" required />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending || !file}>
                    {mutation.isPending ? 'Uploading…' : 'Submit to ADLG →'}
                </Button>
            </form>
        </Modal>
    );
}

function PerformasTab() {
    const [filling, setFilling] = useState(null);
    const [uploading, setUploading] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['sec-performas'],
        queryFn: () => client.get('/api/sec/performas').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    if (!data.length) {
        return <EmptyState icon="📋" title="No performas from your ADLG yet" />;
    }

    return (
        <div className="space-y-3">
            {data.map((p) => {
                const done = p.report_type === 'daily' ? !p.needs_today : !!p.my_response;

                return (
                    <Card key={p.id} className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-lg">
                            {p.mode === 'excel' ? '📊' : '📝'}
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-ink">{p.title}</div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                                <Badge tone={p.report_type === 'daily' ? 'warning' : 'neutral'}>
                                    {p.report_type === 'daily' ? 'Daily' : 'One-time'}
                                </Badge>
                                {p.deadline && <span className="text-[10px] text-ink-faint">Due {p.deadline}</span>}
                                {p.needs_today && <Badge tone="danger">Needs update today</Badge>}
                            </div>
                            {p.description && <p className="mt-1 text-xs text-ink-muted">{p.description}</p>}
                        </div>
                        {done ? (
                            <Badge tone="success">✓ Submitted</Badge>
                        ) : (
                            <Button onClick={() => (p.mode === 'form' ? setFilling(p) : setUploading(p))}>
                                {p.mode === 'form' ? 'Fill Performa' : 'Upload File'}
                            </Button>
                        )}
                    </Card>
                );
            })}

            <FillPerformaModal performa={filling} onClose={() => setFilling(null)} />
            <UploadPerformaModal performa={uploading} onClose={() => setUploading(null)} />
        </div>
    );
}

function DailyReportTab() {
    const queryClient = useQueryClient();
    const [form, setForm] = useState(emptyForm);
    const [attachment, setAttachment] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['sec-reports'],
        queryFn: () => client.get('/api/sec/reports').then((r) => r.data.data),
    });

    const today = new Date().toISOString().slice(0, 10);
    const submittedToday = data?.some((r) => r.report_date === today);

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => formData.append(key, value));
            if (attachment) formData.append('attachment', attachment);
            return client.post('/api/sec/reports', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sec-reports'] });
            setForm(emptyForm);
            setAttachment(null);
            setSuccess(true);
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit report.'),
    });

    if (isLoading) return null;

    return (
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
                            <Field label="Attachment (optional)">
                                <FileInput value={attachment} onChange={setAttachment} accept=".pdf,.jpg,.jpeg,.png" hint="PDF · Image" />
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
                                    {r.attachment_url && (
                                        <a
                                            href={r.attachment_url}
                                            target="_blank"
                                            rel="noopener"
                                            className="mt-1 inline-block text-[11px] font-semibold text-primary-600 hover:underline"
                                        >
                                            📎 Attachment
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}

export default function Reports() {
    useEffect(() => setLastModule('rep'), []);

    const [tab, setTab] = useState('daily');

    const { data: performas } = useQuery({
        queryKey: ['sec-performas'],
        queryFn: () => client.get('/api/sec/performas').then((r) => r.data.data),
    });
    const pendingCount = performas?.filter((p) => (p.report_type === 'daily' ? p.needs_today : !p.my_response)).length || 0;

    return (
        <div>
            <h1 className="mb-4 text-xl font-bold text-ink">Reports</h1>

            <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
                <button
                    onClick={() => setTab('daily')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'daily' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Daily Report
                </button>
                <button
                    onClick={() => setTab('performas')}
                    className={`relative rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'performas' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    ADLG Performas
                    {pendingCount > 0 && (
                        <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
                            {pendingCount}
                        </span>
                    )}
                </button>
            </div>

            {tab === 'daily' ? <DailyReportTab /> : <PerformasTab />}
        </div>
    );
}
