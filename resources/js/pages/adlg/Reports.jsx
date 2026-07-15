import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { Badge, Button, Card, EmptyState, ErrorText, Field, FileInput, FullScreenSpinner, Modal, Select, TextInput, Textarea } from '../../components/ui';

const FIELD_TYPES = ['text', 'number', 'date'];

function CreatePerformaModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const emptyForm = { title: '', description: '', mode: 'form', report_type: 'onetime', deadline: '' };
    const [form, setForm] = useState(emptyForm);
    const [fields, setFields] = useState([{ label: '', type: 'text' }]);
    const [template, setTemplate] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setForm(emptyForm);
        setFields([{ label: '', type: 'text' }]);
        setTemplate(null);
        setError('');
        onClose();
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('title', form.title);
            if (form.description) formData.append('description', form.description);
            formData.append('mode', form.mode);
            formData.append('report_type', form.report_type);
            if (form.deadline) formData.append('deadline', form.deadline);
            if (form.mode === 'excel' && template) formData.append('excel_template', template);
            if (form.mode === 'form') {
                fields
                    .filter((f) => f.label.trim())
                    .forEach((f, i) => {
                        formData.append(`fields[${i}][label]`, f.label);
                        formData.append(`fields[${i}][type]`, f.type);
                    });
            }
            return client.post('/api/adlg/performas', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-performas'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not publish performa.'),
    });

    return (
        <Modal open={open} onClose={close} title="Create Performa" subtitle="Publish to all secretaries in your tehsil">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    setError('');
                    mutation.mutate();
                }}
            >
                <Field label="Title">
                    <TextInput value={form.title} onChange={set('title')} required />
                </Field>
                <Field label="Description (optional)">
                    <Textarea value={form.description} onChange={set('description')} />
                </Field>
                <div className="mb-3 grid grid-cols-2 gap-3">
                    <Field label="Mode">
                        <Select value={form.mode} onChange={set('mode')}>
                            <option value="form">In-app Form</option>
                            <option value="excel">Excel Template</option>
                        </Select>
                    </Field>
                    <Field label="Frequency">
                        <Select value={form.report_type} onChange={set('report_type')}>
                            <option value="onetime">One-time</option>
                            <option value="daily">Daily</option>
                        </Select>
                    </Field>
                </div>
                <Field label="Deadline (optional)">
                    <TextInput type="date" value={form.deadline} onChange={set('deadline')} />
                </Field>

                {form.mode === 'form' ? (
                    <div className="mb-3">
                        <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-muted">Fields</span>
                        <div className="space-y-2">
                            {fields.map((f, i) => (
                                <div key={i} className="flex gap-2">
                                    <TextInput
                                        placeholder="Field label"
                                        value={f.label}
                                        onChange={(e) => setFields(fields.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                                    />
                                    <Select
                                        className="w-32 flex-shrink-0"
                                        value={f.type}
                                        onChange={(e) => setFields(fields.map((x, xi) => (xi === i ? { ...x, type: e.target.value } : x)))}
                                    >
                                        {FIELD_TYPES.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </Select>
                                    {fields.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setFields(fields.filter((_, xi) => xi !== i))}
                                            className="flex-shrink-0 rounded-lg px-2 text-ink-muted hover:bg-surface-subtle hover:text-danger"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={() => setFields([...fields, { label: '', type: 'text' }])}
                            className="mt-2 text-xs font-semibold text-primary-600 hover:underline"
                        >
                            + Add Field
                        </button>
                    </div>
                ) : (
                    <Field label="Excel Template">
                        <FileInput value={template} onChange={setTemplate} accept=".xlsx,.xls,.csv" hint="Excel · CSV" required />
                    </Field>
                )}

                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Publishing…' : 'Publish to All Secretaries →'}
                </Button>
            </form>
        </Modal>
    );
}

function ResponsesModal({ performa, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['performa-responses', performa?.id],
        queryFn: () => client.get(`/api/adlg/performas/${performa.id}/responses`).then((r) => r.data.data),
        enabled: !!performa,
    });

    return (
        <Modal open={!!performa} onClose={onClose} title={performa?.title} subtitle="Secretary responses">
            {isLoading ? (
                <FullScreenSpinner />
            ) : !data?.length ? (
                <EmptyState icon="📭" title="No responses yet" />
            ) : (
                <ul className="max-h-[420px] space-y-3 overflow-y-auto">
                    {data.map((r) => (
                        <li key={r.id} className="rounded-xl border border-border p-3">
                            <div className="mb-1 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-ink">{r.secretary}</div>
                                    <div className="text-xs text-ink-muted">
                                        {r.union_council} · {r.response_date}
                                    </div>
                                </div>
                                <Badge tone="success">✓ Submitted</Badge>
                            </div>
                            {r.type === 'excel' ? (
                                <a href={r.file_url} target="_blank" rel="noopener" className="text-xs font-semibold text-primary-600 hover:underline">
                                    📊 Download filled file
                                </a>
                            ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {r.values.map((v) => (
                                        <div key={v.field_id} className="rounded-lg bg-surface-subtle px-2.5 py-1.5">
                                            <div className="text-[9px] uppercase text-ink-faint">{v.label}</div>
                                            <div className="text-xs font-bold text-ink">{v.value || '—'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

function PerformaCard({ performa, totalSecretaries, onViewResponses }) {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-lg">
                        {performa.mode === 'excel' ? '📊' : '📝'}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-ink">{performa.title}</div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                            <Badge tone="info">{performa.mode === 'excel' ? 'Excel' : 'Form'}</Badge>
                            <Badge tone={performa.report_type === 'daily' ? 'warning' : 'neutral'}>
                                {performa.report_type === 'daily' ? 'Daily' : 'One-time'}
                            </Badge>
                            {performa.deadline && <span className="text-[10px] text-ink-faint">Due {performa.deadline}</span>}
                        </div>
                    </div>
                </div>
                <button onClick={() => onViewResponses(performa)} className="flex-shrink-0 text-xs font-semibold text-primary-600 hover:underline">
                    {performa.responses_count}/{totalSecretaries} responded →
                </button>
            </div>
        </Card>
    );
}

function PerformasTab() {
    const [createOpen, setCreateOpen] = useState(false);
    const [viewing, setViewing] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-performas'],
        queryFn: () => client.get('/api/adlg/performas').then((r) => r.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button onClick={() => setCreateOpen(true)}>+ Performa</Button>
            </div>

            {!data.data.length ? (
                <EmptyState icon="📋" title="No performas published yet" subtitle="Create one to collect structured data from your secretaries." />
            ) : (
                <div className="space-y-3">
                    {data.data.map((p) => (
                        <PerformaCard key={p.id} performa={p} totalSecretaries={data.meta.total_secretaries} onViewResponses={setViewing} />
                    ))}
                </div>
            )}

            <CreatePerformaModal open={createOpen} onClose={() => setCreateOpen(false)} />
            <ResponsesModal performa={viewing} onClose={() => setViewing(null)} />
        </div>
    );
}

function DailyReportsTab() {
    const queryClient = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-reports'],
        queryFn: () => client.get('/api/adlg/reports').then((r) => r.data.data),
    });

    const reviewMutation = useMutation({
        mutationFn: (id) => client.patch(`/api/adlg/reports/${id}/mark-reviewed`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adlg-reports'] }),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <Card>
            <DataTable
                data={data}
                columns={[
                    { title: 'Date', data: 'report_date' },
                    { title: 'Secretary', data: 'secretary' },
                    { title: 'UC', data: 'union_council' },
                    { title: 'Nikah', data: 'nikah_count' },
                    { title: 'Birth', data: 'birth_count' },
                    { title: 'Death', data: 'death_count' },
                    { title: 'Complaints', data: 'complaint_count' },
                    { title: 'Status', data: 'reviewed' },
                    { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                ]}
                slots={{
                    7: (data) => <Badge tone={data ? 'success' : 'warning'}>{data ? 'Reviewed' : 'Pending'}</Badge>,
                    8: (data, row) => (
                        <div className="flex justify-end">
                            {!row.reviewed && (
                                <button
                                    onClick={() => reviewMutation.mutate(row.id)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="Mark Reviewed"
                                >
                                    <CheckIcon className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ),
                }}
            />
        </Card>
    );
}

export default function Reports() {
    const [tab, setTab] = useState('daily');

    return (
        <div>
            <h1 className="mb-4 text-xl font-bold text-ink">Reports</h1>

            <div className="mb-4 inline-flex rounded-lg border border-border bg-surface p-1">
                <button
                    onClick={() => setTab('daily')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'daily' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Daily Reports
                </button>
                <button
                    onClick={() => setTab('performas')}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === 'performas' ? 'bg-primary-500 text-white' : 'text-ink-muted'}`}
                >
                    Performas
                </button>
            </div>

            {tab === 'daily' ? <DailyReportsTab /> : <PerformasTab />}
        </div>
    );
}
