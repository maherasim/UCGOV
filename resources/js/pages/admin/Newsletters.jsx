import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDownTrayIcon,
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    MegaphoneIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import client from '../../api/client';
import {
    Button,
    Card,
    EmptyState,
    ErrorText,
    Field,
    FileInput,
    FullScreenSpinner,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';

const PRIORITY = {
    urgent: { label: 'Urgent', dot: 'bg-danger', border: 'border-l-danger', chip: 'bg-red-50 text-danger border-red-200' },
    normal: { label: 'General', dot: 'bg-primary-500', border: 'border-l-primary-500', chip: 'bg-primary-50 text-primary-700 border-primary-100' },
    info: { label: 'Info', dot: 'bg-blue-500', border: 'border-l-blue-400', chip: 'bg-blue-50 text-info border-blue-200' },
};

function ComposeModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState('normal');
    const [options, setOptions] = useState(['Acknowledged', 'Action Taken', 'Need Clarification']);
    const [attachment, setAttachment] = useState(null);
    const [error, setError] = useState('');

    const close = () => {
        setSubject('');
        setBody('');
        setPriority('normal');
        setOptions(['Acknowledged', 'Action Taken', 'Need Clarification']);
        setAttachment(null);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('body', body);
            formData.append('priority', priority);
            options.filter((o) => o.trim()).forEach((o, i) => formData.append(`options[${i}]`, o));
            if (attachment) formData.append('attachment', attachment);

            return client.post('/api/admin/newsletters', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['newsletters'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not publish newsletter.'),
    });

    return (
        <Modal open={open} onClose={close} title="Compose Newsletter" subtitle="Published to every ADLG instantly">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Subject">
                    <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Revised Attendance Timing Circular" required />
                </Field>
                <Field label="Message">
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the directive, circular, or message here…" required />
                </Field>
                <Field label="Priority">
                    <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="normal">General</option>
                        <option value="urgent">Urgent</option>
                        <option value="info">Info</option>
                    </Select>
                </Field>
                <Field label="Response Options">
                    <div className="space-y-2">
                        {options.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                                <TextInput
                                    value={opt}
                                    onChange={(e) => {
                                        const next = [...options];
                                        next[i] = e.target.value;
                                        setOptions(next);
                                    }}
                                />
                                <button
                                    type="button"
                                    className="rounded-lg border border-border px-3 text-sm text-danger"
                                    onClick={() => setOptions(options.filter((_, idx) => idx !== i))}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            className="text-xs font-semibold text-primary-600"
                            onClick={() => setOptions([...options, ''])}
                        >
                            + Add option
                        </button>
                    </div>
                </Field>
                <Field label="Attachment (optional)">
                    <FileInput
                        value={attachment}
                        onChange={setAttachment}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        hint="PDF, JPG, PNG, DOC up to 10MB"
                    />
                </Field>

                <ErrorText>{error}</ErrorText>

                <Button type="submit" variant="accent" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Publishing…' : '📤 Publish to All ADLGs'}
                </Button>
            </form>
        </Modal>
    );
}

function ResponsesModal({ newsletter, onClose }) {
    const { data, isLoading } = useQuery({
        queryKey: ['newsletter-responses', newsletter?.id],
        queryFn: () => client.get(`/api/admin/newsletters/${newsletter.id}/responses`).then((r) => r.data),
        enabled: !!newsletter,
    });

    return (
        <Modal open={!!newsletter} onClose={onClose} title="Responses" subtitle={newsletter?.subject}>
            {isLoading ? (
                <div className="py-8"><FullScreenSpinner /></div>
            ) : data?.length === 0 ? (
                <EmptyState icon="🕊️" title="No responses yet" subtitle="ADLGs haven't responded to this directive yet." />
            ) : (
                <div className="space-y-3">
                    {data?.map((r) => (
                        <div key={r.id} className="rounded-xl border border-border p-3.5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="text-sm font-bold text-ink">{r.adlg_name}</div>
                                    <div className="text-xs text-ink-muted">Tehsil {r.tehsil || '—'}</div>
                                </div>
                                <span className="flex-shrink-0 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-info">
                                    {r.option}
                                </span>
                            </div>
                            {r.remarks && <p className="mt-2 text-xs italic text-ink-muted">&ldquo;{r.remarks}&rdquo;</p>}
                            <div className="mt-2 text-[11px] text-ink-faint">
                                {new Date(r.responded_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}

function NewsletterCard({ n, totalAdlgs, onViewResponses }) {
    const p = PRIORITY[n.priority] || PRIORITY.normal;
    const responded = n.response_count || 0;
    const pct = totalAdlgs > 0 ? Math.round((responded / totalAdlgs) * 100) : 0;

    return (
        <Card className={`overflow-hidden border-l-4 ${p.border} p-0`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent-100">
                            <MegaphoneIcon className="h-4 w-4 text-accent-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${p.dot}`} />
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${p.chip}`}>
                                    {p.label}
                                </span>
                            </div>
                            <h3 className="mt-1.5 truncate text-[15px] font-bold text-ink">{n.subject}</h3>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                                <span className="font-medium text-ink-muted">Published to all ADLGs</span>
                                <span>·</span>
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                <span>{new Date(n.published_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-3 rounded-xl bg-surface-subtle p-4 text-sm leading-relaxed text-ink">{n.body}</div>

                {n.attachment_url && (
                    <a
                        href={n.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-info hover:bg-blue-100"
                    >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" /> View Attachment
                    </a>
                )}
            </div>

            <div className="border-t border-border bg-surface-subtle/60 px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <UserGroupIcon className="h-4 w-4 flex-shrink-0 text-ink-faint" />
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="font-semibold text-ink">
                                    {responded} of {totalAdlgs} ADLGs responded
                                </span>
                                <span className="text-ink-faint">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                                <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" className="flex-shrink-0" onClick={() => onViewResponses(n)}>
                        <ChatBubbleLeftRightIcon className="h-4 w-4" /> View Responses
                    </Button>
                </div>
            </div>
        </Card>
    );
}

export default function Newsletters() {
    const [modalOpen, setModalOpen] = useState(false);
    const [responsesTarget, setResponsesTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['newsletters'],
        queryFn: () => client.get('/api/admin/newsletters').then((r) => r.data),
    });

    const newsletters = data?.data || [];
    const totalAdlgs = data?.meta?.total_adlgs || 0;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Newsletters &amp; Directives</h1>
                    <p className="text-sm text-ink-muted">Publish official circulars to every ADLG and track responses</p>
                </div>
                <Button variant="accent" onClick={() => setModalOpen(true)}>
                    ✍️ Compose Newsletter
                </Button>
            </div>

            {isLoading ? (
                <FullScreenSpinner />
            ) : newsletters.length === 0 ? (
                <EmptyState icon="📰" title="No newsletters published yet" subtitle="Compose your first directive to reach every ADLG at once." />
            ) : (
                <div className="space-y-4">
                    {newsletters.map((n) => (
                        <NewsletterCard key={n.id} n={n} totalAdlgs={totalAdlgs} onViewResponses={setResponsesTarget} />
                    ))}
                </div>
            )}

            <ComposeModal open={modalOpen} onClose={() => setModalOpen(false)} />
            <ResponsesModal newsletter={responsesTarget} onClose={() => setResponsesTarget(null)} />
        </div>
    );
}
