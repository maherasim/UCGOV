import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckIcon, EyeIcon, PaperClipIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorText, Field, FileInput, FullScreenSpinner, Modal, Select, TextInput, Textarea } from '../../components/ui';

const FIELD_TYPES = ['text', 'number', 'date'];
const emptyPerformaForm = { title: '', description: '', mode: 'form', report_type: 'onetime', deadline: '' };

/** Create + edit share one modal — mode is fixed once created (matches the
 * backend, which rejects changing it), so it's a Select on create only. */
function PerformaFormModal({ open, onClose, performa }) {
    const queryClient = useQueryClient();
    const isEdit = !!performa;
    const [form, setForm] = useState(
        isEdit
            ? {
                  title: performa.title || '',
                  description: performa.description || '',
                  mode: performa.mode,
                  report_type: performa.report_type,
                  deadline: performa.deadline ? performa.deadline.slice(0, 10) : '',
              }
            : emptyPerformaForm
    );
    const [fields, setFields] = useState(
        isEdit && performa.fields?.length ? performa.fields.map((f) => ({ label: f.label, type: f.type })) : [{ label: '', type: 'text' }]
    );
    const [template, setTemplate] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setError('');
        onClose();
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('title', form.title);
            if (form.description) formData.append('description', form.description);
            if (!isEdit) formData.append('mode', form.mode);
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
            if (isEdit) {
                // Laravel doesn't parse multipart bodies on a real PUT — spoof it
                // via _method so the optional template re-upload still works.
                formData.append('_method', 'PUT');
                return client.post(`/api/adlg/performas/${performa.id}`, formData);
            }
            return client.post('/api/adlg/performas', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-performas'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || `Could not ${isEdit ? 'update' : 'publish'} performa.`),
    });

    return (
        <Modal
            open={open}
            onClose={close}
            title={isEdit ? 'Edit Performa' : 'Create Performa'}
            subtitle={isEdit ? performa?.title : 'Publish to all secretaries in your tehsil'}
        >
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
                        {isEdit ? (
                            <div className="flex h-full items-center">
                                <Badge tone="info">{form.mode === 'excel' ? 'Excel Template' : 'In-app Form'}</Badge>
                            </div>
                        ) : (
                            <Select value={form.mode} onChange={set('mode')}>
                                <option value="form">In-app Form</option>
                                <option value="excel">Excel Template</option>
                            </Select>
                        )}
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
                    <Field label={isEdit ? 'Replace Excel Template (optional)' : 'Excel Template'}>
                        <FileInput value={template} onChange={setTemplate} accept=".xlsx,.xls,.csv" hint="Excel · CSV" required={!isEdit} />
                        {isEdit && !template && (
                            <p className="mt-1 text-xs text-ink-faint">
                                {performa.has_template ? 'Leave blank to keep the current template.' : 'No template attached yet.'}
                            </p>
                        )}
                    </Field>
                )}

                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? (isEdit ? 'Saving…' : 'Publishing…') : isEdit ? 'Save Changes' : 'Publish to All Secretaries →'}
                </Button>
            </form>
        </Modal>
    );
}

function PerformaDetailModal({ performa, onClose }) {
    return (
        <Modal open={!!performa} onClose={onClose} title={performa?.title} subtitle="Performa details">
            {performa && (
                <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="info">{performa.mode === 'excel' ? 'Excel Template' : 'In-app Form'}</Badge>
                        <Badge tone={performa.report_type === 'daily' ? 'warning' : 'neutral'}>
                            {performa.report_type === 'daily' ? 'Daily' : 'One-time'}
                        </Badge>
                        {performa.deadline && <Badge tone="neutral">Due {performa.deadline.slice(0, 10)}</Badge>}
                    </div>

                    {performa.description && (
                        <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Description</div>
                            <p className="text-xs text-ink">{performa.description}</p>
                        </div>
                    )}

                    {performa.mode === 'form' ? (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                                Fields ({performa.fields?.length || 0})
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {performa.fields?.map((f) => (
                                    <div key={f.id} className="rounded-lg bg-surface-subtle px-2.5 py-1.5">
                                        <div className="text-[9px] uppercase text-ink-faint">{f.type}</div>
                                        <div className="text-xs font-bold text-ink">{f.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-3 rounded-xl border border-border p-3 text-xs text-ink">
                            {performa.has_template ? '📊 Excel template attached' : 'No template attached'}
                        </div>
                    )}

                    <div className="text-xs text-ink-muted">{performa.responses_count ?? 0} response(s) so far</div>
                </div>
            )}
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
            {!!data?.length && (
                <div className="mb-3 flex justify-end">
                    <Button
                        variant="ghost"
                        onClick={() => window.open(`${APP_BASE_PATH}/api/adlg/performas/${performa.id}/responses/export`, '_blank')}
                    >
                        📊 Export Excel
                    </Button>
                </div>
            )}
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

function PerformaCard({ performa, totalSecretaries, onViewResponses, onViewDetails, onEdit, onDelete }) {
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
            <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
                <button
                    onClick={() => onViewDetails(performa)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                    aria-label="View Details"
                    title="View Details"
                >
                    <EyeIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onEdit(performa)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                    aria-label="Edit"
                    title="Edit"
                >
                    <PencilSquareIcon className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onDelete(performa)}
                    className="rounded-lg p-1.5 text-ink-muted hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete"
                    title="Delete"
                >
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
        </Card>
    );
}

function PerformasTab() {
    const queryClient = useQueryClient();
    const [formTarget, setFormTarget] = useState(null);
    const [detailTarget, setDetailTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [viewing, setViewing] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-performas'],
        queryFn: () => client.get('/api/adlg/performas').then((r) => r.data),
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => client.delete(`/api/adlg/performas/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-performas'] });
            setDeleteTarget(null);
        },
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex justify-end">
                <Button onClick={() => setFormTarget({})}>+ Performa</Button>
            </div>

            {!data.data.length ? (
                <EmptyState icon="📋" title="No performas published yet" subtitle="Create one to collect structured data from your secretaries." />
            ) : (
                <div className="space-y-3">
                    {data.data.map((p) => (
                        <PerformaCard
                            key={p.id}
                            performa={p}
                            totalSecretaries={data.meta.total_secretaries}
                            onViewResponses={setViewing}
                            onViewDetails={setDetailTarget}
                            onEdit={setFormTarget}
                            onDelete={setDeleteTarget}
                        />
                    ))}
                </div>
            )}

            <PerformaFormModal
                key={formTarget?.id || 'new'}
                open={!!formTarget}
                performa={formTarget?.id ? formTarget : null}
                onClose={() => setFormTarget(null)}
            />
            <PerformaDetailModal performa={detailTarget} onClose={() => setDetailTarget(null)} />
            <ResponsesModal performa={viewing} onClose={() => setViewing(null)} />

            <ConfirmDialog
                open={!!deleteTarget}
                title="Delete Performa"
                message={
                    deleteTarget
                        ? `"${deleteTarget.title}" and all ${deleteTarget.responses_count ?? 0} secretary response(s) will be permanently deleted. This can't be undone.`
                        : ''
                }
                confirmLabel="Delete"
                pending={deleteMutation.isPending}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
            />
        </div>
    );
}

/**
 * ADLG defines standing fields here (e.g. "Vaccination Count") — once added, it
 * shows up on every secretary's daily report form in this tehsil for them to
 * answer, alongside their own ad-hoc fields, until deactivated here.
 */
function ManageReportFieldsModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const [label, setLabel] = useState('');
    const [error, setError] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-report-fields'],
        queryFn: () => client.get('/api/adlg/report-fields').then((r) => r.data.data),
        enabled: open,
        initialData: [],
    });

    const addMutation = useMutation({
        mutationFn: () => client.post('/api/adlg/report-fields', { label }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-report-fields'] });
            setLabel('');
            setError('');
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not add field.'),
    });

    const toggleMutation = useMutation({
        mutationFn: (id) => client.patch(`/api/adlg/report-fields/${id}/toggle-active`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adlg-report-fields'] }),
    });

    return (
        <Modal open={open} onClose={onClose} title="Manage Additional Fields" subtitle="Shown on every secretary's daily report form in your tehsil">
            <form
                className="mb-4 flex gap-2"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (label.trim()) addMutation.mutate();
                }}
            >
                <TextInput placeholder="e.g. Vaccination Count" value={label} onChange={(e) => setLabel(e.target.value)} />
                <Button type="submit" disabled={!label.trim() || addMutation.isPending} className="flex-shrink-0">
                    + Add Field
                </Button>
            </form>
            <ErrorText>{error}</ErrorText>

            {isLoading ? (
                <p className="py-4 text-center text-sm text-ink-muted">Loading…</p>
            ) : data.length === 0 ? (
                <p className="py-4 text-center text-sm text-ink-muted">No additional fields defined yet.</p>
            ) : (
                <ul className="space-y-2">
                    {data.map((f) => (
                        <li key={f.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                            <span className={`text-sm font-medium ${f.active ? 'text-ink' : 'text-ink-faint line-through'}`}>{f.label}</span>
                            <button
                                onClick={() => toggleMutation.mutate(f.id)}
                                disabled={toggleMutation.isPending}
                                className="flex-shrink-0"
                            >
                                <Badge tone={f.active ? 'success' : 'neutral'}>{f.active ? 'Active' : 'Inactive'}</Badge>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

function ReportDetailModal({ report, onClose, onMarkReviewed }) {
    return (
        <Modal open={!!report} onClose={onClose} title={report?.report_date} subtitle={report ? `${report.secretary} · ${report.union_council}` : ''}>
            {report && (
                <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone={report.reviewed ? 'success' : 'warning'}>{report.reviewed ? 'Reviewed' : 'Pending'}</Badge>
                    </div>

                    <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                        {[
                            ['Nikah', report.nikah_count],
                            ['Birth', report.birth_count],
                            ['Death', report.death_count],
                            ['Complaints', report.complaint_count],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-border p-2">
                                <div className="text-[9px] font-bold uppercase text-ink-muted">{label}</div>
                                <div className="text-lg font-bold text-ink">{value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-3 rounded-xl bg-surface-subtle p-3">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Remarks</div>
                        <p className="text-xs text-ink">{report.remarks || '—'}</p>
                    </div>

                    {report.custom_fields?.length > 0 && (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Additional Fields</div>
                            <div className="flex flex-wrap gap-2">
                                {report.custom_fields.map((f, i) => (
                                    <div key={i} className="rounded-lg bg-surface-subtle px-2.5 py-1.5">
                                        <div className="text-[9px] uppercase text-ink-faint">{f.label}</div>
                                        <div className="text-xs font-bold text-ink">{f.value || '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {report.attachment_url && (
                        <a
                            href={report.attachment_url}
                            target="_blank"
                            rel="noopener"
                            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:underline"
                        >
                            <PaperClipIcon className="h-4 w-4" /> View Attachment
                        </a>
                    )}

                    {!report.reviewed && (
                        <Button className="w-full" onClick={() => onMarkReviewed(report.id)}>
                            <CheckIcon className="h-4 w-4" /> Mark Reviewed
                        </Button>
                    )}
                </div>
            )}
        </Modal>
    );
}

function DailyReportsTab() {
    const queryClient = useQueryClient();
    const [viewing, setViewing] = useState(null);
    const [managingFields, setManagingFields] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-reports'],
        queryFn: () => client.get('/api/adlg/reports').then((r) => r.data.data),
    });

    const reviewMutation = useMutation({
        mutationFn: (id) => client.patch(`/api/adlg/reports/${id}/mark-reviewed`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-reports'] });
            setViewing(null);
        },
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-3 flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setManagingFields(true)}>
                    ⚙️ Manage Additional Fields
                </Button>
                <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/adlg/reports/export`, '_blank')}>
                    📊 Export Excel
                </Button>
            </div>
            <ManageReportFieldsModal open={managingFields} onClose={() => setManagingFields(false)} />
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
                            <div className="flex justify-end gap-1">
                                <button
                                    onClick={() => setViewing(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="View Details"
                                    title="View Details"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                                {row.attachment_url && (
                                    <a
                                        href={row.attachment_url}
                                        target="_blank"
                                        rel="noopener"
                                        className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                        aria-label="View Attachment"
                                        title="View Attachment"
                                    >
                                        <PaperClipIcon className="h-4 w-4" />
                                    </a>
                                )}
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

            <ReportDetailModal report={viewing} onClose={() => setViewing(null)} onMarkReviewed={(id) => reviewMutation.mutate(id)} />
        </div>
    );
}

export default function Reports() {
    useEffect(() => setLastModule('rep'), []);

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
