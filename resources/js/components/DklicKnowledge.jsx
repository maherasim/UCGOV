import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookmarkIcon as BookmarkOutline, CalendarDaysIcon, CheckBadgeIcon, PaperAirplaneIcon, SparklesIcon, TagIcon } from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid';
import client from '../api/client';
import { getLastModule, MODULE_KEYWORDS, MODULE_LABELS } from '../utils/lastModule';
import { Badge, Button, Card, EmptyState, FullScreenSpinner, Modal, TextInput } from './ui';

const CATEGORIES = [
    'Rules', 'Punjab Gazette', 'Government Notification', 'Circular', 'SOP',
    'Office Order', 'Manual', 'Policy', 'Form/Template', 'Training Material',
    'Act', 'Official Letter',
];

const SUGGESTIONS = [
    'What documents are required for delayed birth registration?',
    'Explain divorce arbitration council procedure',
    'Which authority approves delayed birth registration?',
    'What are nikah registration requirements?',
];

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'urgent', label: 'Urgent' },
    { key: 'bookmarked', label: 'Bookmarked' },
    { key: 'unread', label: 'Unread' },
    { key: 'recent', label: 'Recent' },
];

export function AiAssistant({ role }) {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hello! I am the LGCD AI Legal Intelligence Assistant.\n\nI answer questions exclusively from documents uploaded to the DKLIC Knowledge Repository — Rules, Gazettes, Circulars, SOPs, and official orders. I always cite the exact source document and reference number.\n\nHow can I assist you today?',
        },
    ]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, thinking]);

    const mutation = useMutation({
        mutationFn: (query) => client.post(`/api/${role}/dklic-ai/ask`, { query }).then((r) => r.data),
        onMutate: () => setThinking(true),
        onSuccess: (data) => {
            setMessages((m) => [...m, { role: 'bot', text: data.answer, sources: data.sources }]);
        },
        onError: (err) => {
            setMessages((m) => [...m, { role: 'bot', text: err.response?.data?.message || 'Something went wrong. Please try again.' }]);
        },
        onSettled: () => setThinking(false),
    });

    const ask = (q) => {
        const query = (q ?? input).trim();
        if (!query) return;
        setMessages((m) => [...m, { role: 'user', text: query }]);
        setInput('');
        mutation.mutate(query);
    };

    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2.5 border-b border-border bg-primary-50 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white">
                    <SparklesIcon className="h-4 w-4" />
                </div>
                <div>
                    <div className="text-sm font-bold text-ink">AI Legal Intelligence Assistant</div>
                    <div className="text-xs text-ink-muted">Answers sourced exclusively from the DKLIC Repository</div>
                </div>
            </div>

            <div ref={scrollRef} className="max-h-[65vh] min-h-[320px] space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                        <div
                            className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                m.role === 'user'
                                    ? 'rounded-tr-sm bg-primary-500 text-white'
                                    : 'rounded-tl-sm border border-border bg-surface-subtle text-ink'
                            }`}
                        >
                            {m.text}
                            {m.sources?.length > 0 && (
                                <div className="mt-2 border-t border-border/60 pt-2">
                                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-info">📎 Sources cited</div>
                                    {m.sources.map((s) => (
                                        <div key={s.id} className="text-[11px] text-ink-muted">
                                            • <span className="font-medium text-info">{s.title}</span>
                                            {s.reference_no ? ` [${s.reference_no}]` : ''}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {thinking && (
                    <div className="flex">
                        <div className="rounded-2xl rounded-tl-sm border border-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-muted">
                            🤖 Searching knowledge repository…
                        </div>
                    </div>
                )}
            </div>

            {messages.length <= 1 && (
                <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                    {SUGGESTIONS.map((s) => (
                        <button
                            key={s}
                            onClick={() => ask(s)}
                            className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted hover:border-primary-300 hover:text-primary-600"
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    ask();
                }}
                className="flex items-center gap-2 border-t border-border p-3"
            >
                <TextInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about rules, gazettes, circulars…"
                    disabled={thinking}
                />
                <Button type="submit" disabled={thinking || !input.trim()} className="flex-shrink-0">
                    <PaperAirplaneIcon className="h-4 w-4" />
                </Button>
            </form>
        </Card>
    );
}

const priorityChip = { urgent: 'bg-red-50 text-danger border-red-200', normal: 'bg-primary-50 text-primary-700 border-primary-100' };

function DocumentDetailModal({ doc: initialDoc, role, onClose }) {
    const queryClient = useQueryClient();
    const [doc, setDoc] = useState(initialDoc);

    useEffect(() => {
        setDoc(initialDoc);
    }, [initialDoc]);

    const refreshList = () => queryClient.invalidateQueries({ queryKey: ['dklic-documents', role] });

    const viewMutation = useMutation({
        mutationFn: () => client.post(`/api/${role}/dklic-documents/${initialDoc.id}/view`),
        onSuccess: () => {
            setDoc((d) => (d ? { ...d, read: true } : d));
            refreshList();
        },
    });

    useEffect(() => {
        if (initialDoc && !initialDoc.read) viewMutation.mutate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDoc?.id]);

    const downloadMutation = useMutation({
        mutationFn: () => client.post(`/api/${role}/dklic-documents/${initialDoc.id}/download`),
        onSuccess: () => {
            setDoc((d) => (d ? { ...d, read: true, download_count: d.download_count + 1 } : d));
            refreshList();
            window.open(initialDoc.file_url, '_blank');
        },
    });

    const ackMutation = useMutation({
        mutationFn: () => client.post(`/api/${role}/dklic-documents/${initialDoc.id}/acknowledge`).then((r) => r.data),
        onSuccess: (updated) => {
            setDoc((d) => (d ? { ...d, ...updated.data } : d));
            refreshList();
        },
    });

    if (!doc) return null;

    return (
        <Modal open={!!doc} onClose={onClose} title={doc.title} subtitle={`${doc.category}${doc.reference_no ? ' · ' + doc.reference_no : ''}`}>
            <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityChip[doc.priority]}`}>
                    {doc.priority}
                </span>
                <Badge tone="neutral">{doc.audience}</Badge>
                {doc.ack_required && (
                    <span className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-info">
                        <CheckBadgeIcon className="h-3 w-3" /> Acknowledgement Required
                    </span>
                )}
            </div>

            <p className="mt-3 text-sm font-medium text-ink">{doc.subject}</p>
            {doc.description && <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{doc.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
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

            <div className="mt-5 flex gap-2">
                <Button onClick={() => downloadMutation.mutate()} disabled={downloadMutation.isPending} className="flex-1">
                    {downloadMutation.isPending ? 'Opening…' : '📥 Download'}
                </Button>
                {doc.ack_required && !doc.acknowledged && (
                    <Button variant="accent" onClick={() => ackMutation.mutate()} disabled={ackMutation.isPending} className="flex-1">
                        {ackMutation.isPending ? 'Saving…' : '✅ Acknowledge'}
                    </Button>
                )}
                {doc.ack_required && doc.acknowledged && (
                    <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-50 text-sm font-semibold text-primary-700">
                        <CheckBadgeIcon className="h-4 w-4" /> Acknowledged
                    </div>
                )}
            </div>
        </Modal>
    );
}

function DocumentCard({ doc, role, onOpen }) {
    const queryClient = useQueryClient();

    const bookmarkMutation = useMutation({
        mutationFn: () => client.post(`/api/${role}/dklic-documents/${doc.id}/bookmark`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dklic-documents', role] }),
    });

    return (
        <Card className={`overflow-hidden border-l-4 p-0 ${doc.priority === 'urgent' ? 'border-l-danger' : 'border-l-primary-500'}`}>
            <button onClick={() => onOpen(doc)} className="block w-full p-5 text-left">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="neutral">{doc.category}</Badge>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${priorityChip[doc.priority]}`}>
                                {doc.priority}
                            </span>
                            {!doc.read && <span className="h-2 w-2 rounded-full bg-info" title="Unread" />}
                            {doc.ack_required && !doc.acknowledged && (
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
                            <span>{doc.format}</span>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            bookmarkMutation.mutate();
                        }}
                        className="flex-shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-surface-subtle hover:text-accent-600"
                        aria-label={doc.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                    >
                        {doc.bookmarked ? <BookmarkSolid className="h-5 w-5 text-accent-500" /> : <BookmarkOutline className="h-5 w-5" />}
                    </button>
                </div>
            </button>
        </Card>
    );
}

function SmartRecommendations({ documents, onOpen }) {
    const lastModule = getLastModule();
    if (!lastModule || !MODULE_KEYWORDS[lastModule]) return null;

    const keywords = MODULE_KEYWORDS[lastModule];
    const relevant = documents
        .filter((d) =>
            keywords.some(
                (kw) => d.title.toLowerCase().includes(kw) || (d.tags || []).some((t) => t.toLowerCase().includes(kw))
            )
        )
        .slice(0, 2);

    if (!relevant.length) return null;

    return (
        <div className="mb-3 rounded-xl border border-accent-400/30 bg-accent-100/40 px-4 py-3">
            <p className="text-xs text-ink-muted">
                Based on your recent activity in <b className="text-ink">{MODULE_LABELS[lastModule]}</b>, these documents may be
                relevant:
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {relevant.map((d) => (
                    <button
                        key={d.id}
                        onClick={() => onOpen(d)}
                        className="rounded-full border border-accent-400/30 bg-surface px-2.5 py-1 text-[11px] font-semibold text-accent-600 hover:bg-accent-100/60"
                    >
                        📄 {d.title}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function DklicKnowledge({ role }) {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [filter, setFilter] = useState('all');
    const [openDoc, setOpenDoc] = useState(null);

    const params = { search: search || undefined, category: category || undefined, filter: filter !== 'all' ? filter : undefined };

    const { data, isLoading } = useQuery({
        queryKey: ['dklic-documents', role, params],
        queryFn: () => client.get(`/api/${role}/dklic-documents`, { params }).then((r) => r.data.data),
    });

    return (
        <div>
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[200px] flex-1">
                    <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules, gazette no., subject, keywords…" />
                </div>
                <div className="w-44">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            filter === f.key ? 'border-primary-500 bg-primary-500 text-white' : 'border-border bg-surface text-ink-muted hover:border-primary-200'
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {isLoading ? (
                    <FullScreenSpinner />
                ) : data.length === 0 ? (
                    <EmptyState icon="📂" title="No documents match the current filters" />
                ) : (
                    <div>
                        <SmartRecommendations documents={data} onOpen={setOpenDoc} />
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {data.map((d) => (
                                <DocumentCard key={d.id} doc={d} role={role} onOpen={setOpenDoc} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <DocumentDetailModal doc={openDoc} role={role} onClose={() => setOpenDoc(null)} />
        </div>
    );
}
