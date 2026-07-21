import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownTrayIcon, CalendarDaysIcon, CheckCircleIcon, ClockIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import { Button, Card, EmptyState, ErrorText, Field, FullScreenSpinner, Modal, Textarea } from '../../components/ui';

const PRIORITY = {
    urgent: { label: 'Urgent', dot: 'bg-danger', border: 'border-l-danger', chip: 'bg-red-50 text-danger border-red-200' },
    normal: { label: 'General', dot: 'bg-primary-500', border: 'border-l-primary-500', chip: 'bg-primary-50 text-primary-700 border-primary-100' },
    info: { label: 'Info', dot: 'bg-blue-500', border: 'border-l-blue-400', chip: 'bg-blue-50 text-info border-blue-200' },
};

function RespondModal({ newsletter, onClose }) {
    const queryClient = useQueryClient();
    const [optionId, setOptionId] = useState(newsletter?.my_response?.option_id || '');
    const [remarks, setRemarks] = useState(newsletter?.my_response?.remarks || '');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () =>
            client.post(`/api/ddlg/newsletters/${newsletter.id}/respond`, {
                newsletter_option_id: optionId,
                remarks,
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ddlg-newsletters'] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit response.'),
    });

    return (
        <Modal open={!!newsletter} onClose={onClose} title="Respond to Directive" subtitle={newsletter?.subject}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!optionId) {
                        setError('Select a response option.');
                        return;
                    }
                    mutation.mutate();
                }}
            >
                <Field label="Your Response">
                    <div className="space-y-2">
                        {newsletter?.options.map((o) => (
                            <button
                                type="button"
                                key={o.id}
                                onClick={() => setOptionId(o.id)}
                                className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
                                    optionId === o.id
                                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                                        : 'border-border bg-surface text-ink hover:border-primary-200'
                                }`}
                            >
                                <span
                                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                                        optionId === o.id ? 'border-primary-500 bg-primary-500' : 'border-border'
                                    }`}
                                >
                                    {optionId === o.id && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                </span>
                                {o.label}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Remarks (optional)">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Add any context for the Super Admin…" />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Submitting…' : 'Submit Response'}
                </Button>
            </form>
        </Modal>
    );
}

function NewsletterCard({ n, onRespond }) {
    const p = PRIORITY[n.priority] || PRIORITY.normal;
    const responded = !!n.my_response;
    const respondedOption = responded ? n.options.find((o) => o.id === n.my_response.option_id) : null;

    return (
        <Card className={`overflow-hidden border-l-4 ${p.border} p-0`}>
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary-50">
                            <MegaphoneIcon className="h-4 w-4 text-primary-600" />
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
                                <span className="font-medium text-ink-muted">Office of the Super Admin</span>
                                <span>·</span>
                                <CalendarDaysIcon className="h-3.5 w-3.5" />
                                <span>{new Date(n.published_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            </div>
                        </div>
                    </div>

                    {responded ? (
                        <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-primary-100 bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
                            <CheckCircleIcon className="h-3.5 w-3.5" /> Responded
                        </span>
                    ) : (
                        <span className="flex flex-shrink-0 items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-danger">
                            <ClockIcon className="h-3.5 w-3.5" /> Action Needed
                        </span>
                    )}
                </div>

                <div className="mt-3 rounded-xl bg-surface-subtle p-4 text-sm leading-relaxed text-ink">{n.body}</div>

                {n.attachment_url && (
                    <a
                        href={n.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-info hover:bg-blue-100"
                    >
                        <ArrowDownTrayIcon className="h-3.5 w-3.5" /> Download Attachment
                    </a>
                )}
            </div>

            <div className="border-t border-border bg-surface-subtle/60 px-5 py-3.5">
                {responded ? (
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wide text-primary-600">Your Response</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-info">
                                {respondedOption?.label || '—'}
                            </span>
                            <span className="text-xs text-ink-faint">
                                {n.my_response.responded_at && new Date(n.my_response.responded_at).toLocaleDateString('en-PK', { dateStyle: 'medium' })}
                            </span>
                        </div>
                        {n.my_response.remarks && <p className="mt-2 text-xs italic text-ink-muted">&ldquo;{n.my_response.remarks}&rdquo;</p>}
                    </div>
                ) : (
                    <Button onClick={() => onRespond(n)} className="w-full sm:w-auto">
                        ✍️ Respond to this Directive
                    </Button>
                )}
            </div>
        </Card>
    );
}

export default function Newsletters() {
    const [respondTarget, setRespondTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-newsletters'],
        queryFn: () => client.get('/api/ddlg/newsletters').then((r) => r.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    const pendingCount = data.filter((n) => !n.my_response).length;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Directives &amp; Newsletters</h1>
                    <p className="text-sm text-ink-muted">Official circulars published by the Super Admin</p>
                </div>
                {pendingCount > 0 && (
                    <span className="flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-danger">
                        <ClockIcon className="h-4 w-4" /> {pendingCount} awaiting response
                    </span>
                )}
            </div>

            {data.length === 0 ? (
                <EmptyState icon="📰" title="No newsletters yet" subtitle="Directives published by the Super Admin will appear here." />
            ) : (
                <div className="space-y-4">
                    {data.map((n) => (
                        <NewsletterCard key={n.id} n={n} onRespond={setRespondTarget} />
                    ))}
                </div>
            )}

            <RespondModal newsletter={respondTarget} onClose={() => setRespondTarget(null)} />
        </div>
    );
}
