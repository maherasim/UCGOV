import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArchiveBoxIcon,
    ArrowDownTrayIcon,
    ArrowUpTrayIcon,
    BookOpenIcon,
    CalendarDaysIcon,
    CheckBadgeIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    Squares2X2Icon,
    TagIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import { APP_BASE_PATH } from '../../utils/basePath';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorText,
    Field,
    FileInput,
    FullScreenSpinner,
    KpiCard,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';

const CATEGORIES = [
    'Rules', 'Punjab Gazette', 'Government Notification', 'Circular', 'SOP',
    'Office Order', 'Manual', 'Policy', 'Form/Template', 'Training Material',
    'Act', 'Official Letter',
];

const CHIPS = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'Rules', label: 'Rules' },
    { key: 'Punjab Gazette', label: 'Gazette' },
    { key: 'Circular', label: 'Circular' },
    { key: 'Form/Template', label: 'Forms' },
];

function UploadModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const emptyForm = {
        title: '', category: '', subject: '', description: '', content_text: '',
        reference_no: '', issue_date: '', effective_date: '', version: '1.0',
        audience: 'All', priority: 'normal', ack_required: false, tagsInput: '',
    };
    const [form, setForm] = useState(emptyForm);
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setForm(emptyForm);
        setFile(null);
        setError('');
        onClose();
    };

    const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (key === 'tagsInput') return;
                if (key === 'ack_required') {
                    formData.append(key, value ? '1' : '0');
                    return;
                }
                if (value !== '') formData.append(key, value);
            });
            form.tagsInput
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
                .forEach((tag, i) => formData.append(`tags[${i}]`, tag));
            formData.append('file', file);

            return client.post('/api/admin/dklic-documents', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dklic-documents'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not upload document.'),
    });

    return (
        <Modal open={open} onClose={close} title="Upload Document" subtitle="Publish to DKLIC Knowledge Repository">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!file) {
                        setError('Please attach the document file.');
                        return;
                    }
                    mutation.mutate();
                }}
            >
                <Field label="Title">
                    <TextInput value={form.title} onChange={set('title')} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Category">
                        <Select value={form.category} onChange={set('category')} required>
                            <option value="">Select…</option>
                            {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field label="Reference No. (optional)">
                        <TextInput value={form.reference_no} onChange={set('reference_no')} placeholder="LGCD-CIR-2026-01" />
                    </Field>
                </div>
                <Field label="Subject">
                    <TextInput value={form.subject} onChange={set('subject')} placeholder="One-line summary" required />
                </Field>
                <Field label="Description (optional)">
                    <Textarea value={form.description} onChange={set('description')} placeholder="Longer description or notes…" />
                </Field>
                <Field label="Searchable Content (optional)">
                    <Textarea
                        value={form.content_text}
                        onChange={set('content_text')}
                        placeholder="Paste key text so the Knowledge Assistant can find this document when ADLGs/Secretaries ask questions…"
                    />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Issue Date (optional)">
                        <TextInput type="date" value={form.issue_date} onChange={set('issue_date')} />
                    </Field>
                    <Field label="Effective Date (optional)">
                        <TextInput type="date" value={form.effective_date} onChange={set('effective_date')} />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Audience">
                        <Select value={form.audience} onChange={set('audience')}>
                            <option value="All">All</option>
                            <option value="ADLG">ADLG</option>
                            <option value="Secretary UC">Secretary UC</option>
                        </Select>
                    </Field>
                    <Field label="Priority">
                        <Select value={form.priority} onChange={set('priority')}>
                            <option value="normal">Normal</option>
                            <option value="urgent">Urgent</option>
                        </Select>
                    </Field>
                </div>
                <Field label="Tags (comma separated, optional)">
                    <TextInput value={form.tagsInput} onChange={set('tagsInput')} placeholder="birth registration, LBR, form" />
                </Field>
                <label className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                    <input
                        type="checkbox"
                        checked={form.ack_required}
                        onChange={(e) => setForm({ ...form, ack_required: e.target.checked })}
                        className="h-4 w-4 rounded border-border text-primary-600 focus:ring-primary-500"
                    />
                    Require ADLGs/Secretaries to acknowledge this document
                </label>
                <Field label="Document File">
                    <FileInput value={file} onChange={setFile} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" hint="PDF, Word, Excel, or image up to 10MB" />
                </Field>

                <ErrorText>{error}</ErrorText>

                <Button type="submit" variant="accent" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Publishing…' : '📚 Publish to Knowledge Centre'}
                </Button>
            </form>
        </Modal>
    );
}

const priorityChip = { urgent: 'bg-red-50 text-danger border-red-200', normal: 'bg-primary-50 text-primary-700 border-primary-100' };

function DocumentCard({ doc, onArchive }) {
    return (
        <Card className={`overflow-hidden border-l-4 p-0 ${doc.priority === 'urgent' ? 'border-l-danger' : 'border-l-primary-500'} ${doc.archived ? 'opacity-60' : ''}`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{doc.category}</Badge>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityChip[doc.priority]}`}>
                                {doc.priority}
                            </span>
                            {doc.archived && <Badge tone="warning">Archived</Badge>}
                            {doc.ack_required && (
                                <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-info">
                                    <CheckBadgeIcon className="h-3 w-3" /> Ack Required
                                </span>
                            )}
                        </div>
                        <h3 className="mt-1.5 text-[15px] font-bold text-ink">{doc.title}</h3>
                        <p className="mt-0.5 text-sm text-ink-muted">{doc.subject}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
                            {doc.reference_no && <span>Ref: {doc.reference_no}</span>}
                            <span className="flex items-center gap-1">
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                {new Date(doc.published_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                            </span>
                            <span>v{doc.version}</span>
                            <span>{doc.format}</span>
                            <span>By {doc.uploaded_by}</span>
                        </div>
                        {doc.tags?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {doc.tags.map((t) => (
                                    <span key={t} className="flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-medium text-ink-muted">
                                        <TagIcon className="h-3 w-3" /> {t}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-surface-subtle/60 px-5 py-3">
                <div className="flex items-center gap-4 text-xs text-ink-muted">
                    <span>👁 {doc.view_count} views</span>
                    <span>⬇ {doc.download_count} downloads</span>
                </div>
                <div className="flex items-center gap-2">
                    <a href={doc.file_url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-primary-600" aria-label="Download">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                    </a>
                    <button onClick={() => onArchive(doc)} className="rounded-lg p-1.5 text-ink-muted hover:bg-surface hover:text-danger" aria-label={doc.archived ? 'Unarchive' : 'Archive'}>
                        <ArchiveBoxIcon className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </Card>
    );
}

export default function Dklic() {
    const queryClient = useQueryClient();
    const [uploadOpen, setUploadOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [audience, setAudience] = useState('');
    const [chip, setChip] = useState('all');

    const params = {
        search: search || undefined,
        category: chip !== 'all' && chip !== 'urgent' ? chip : category || undefined,
        audience: audience || undefined,
        urgent_only: chip === 'urgent' ? 1 : undefined,
    };

    const { data, isLoading } = useQuery({
        queryKey: ['dklic-documents', params],
        queryFn: () => client.get('/api/admin/dklic-documents', { params }).then((r) => r.data),
    });

    const archiveMutation = useMutation({
        mutationFn: (doc) => client.patch(`/api/admin/dklic-documents/${doc.id}/archive`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dklic-documents'] }),
    });

    const documents = data?.data || [];
    const meta = data?.meta || {};

    const handleExport = () => {
        window.open(`${APP_BASE_PATH}/api/admin/dklic-documents/export`, '_blank');
    };

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">DKLIC</h1>
                    <p className="text-sm text-ink-muted">Digital Knowledge, Legal Intelligence &amp; Notifications Centre</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleExport}>
                        📊 Export Excel
                    </Button>
                    <Button variant="accent" onClick={() => setUploadOpen(true)}>
                        <ArrowUpTrayIcon className="h-4 w-4" /> Upload Document
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
                <KpiCard icon={BookOpenIcon} tone="primary" label="Total Docs" value={meta.total ?? 0} />
                <KpiCard icon={ClockIcon} tone="danger" label="Urgent" value={meta.urgent ?? 0} />
                <KpiCard icon={CheckBadgeIcon} tone="info" label="Acknowledged" value={meta.acknowledged ?? 0} />
                <KpiCard icon={Squares2X2Icon} tone="accent" label="Categories" value={meta.categories ?? 0} />
                <KpiCard icon={ClockIcon} tone="accent" label="Pending Acks" value={meta.pending_ack ?? 0} />
                <KpiCard icon={MagnifyingGlassIcon} tone="primary" label="AI Queries" value={meta.ai_queries ?? 0} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] flex-1">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint" />
                    <div className="[&_input]:pl-9">
                        <TextInput
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, ref. no., tags…"
                        />
                    </div>
                </div>
                <div className="w-44">
                    <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </Select>
                </div>
                <div className="w-40">
                    <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
                        <option value="">All Audiences</option>
                        <option value="All">All</option>
                        <option value="ADLG">ADLG</option>
                        <option value="Secretary UC">Secretary UC</option>
                    </Select>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {CHIPS.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => setChip(c.key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            chip === c.key ? 'border-primary-500 bg-primary-500 text-white' : 'border-border bg-surface text-ink-muted hover:border-primary-200'
                        }`}
                    >
                        {c.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {isLoading ? (
                    <FullScreenSpinner />
                ) : documents.length === 0 ? (
                    <EmptyState icon="📂" title="No documents match the current filters" />
                ) : (
                    <div className="space-y-4">
                        {documents.map((doc) => (
                            <DocumentCard key={doc.id} doc={doc} onArchive={(d) => archiveMutation.mutate(d)} />
                        ))}
                    </div>
                )}
            </div>

            <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
        </div>
    );
}
