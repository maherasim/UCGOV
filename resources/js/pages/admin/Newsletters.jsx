import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import client from '../../api/client';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    ErrorText,
    Field,
    FullScreenSpinner,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';

const priorityTone = { normal: 'info', urgent: 'danger', info: 'success' };

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
        <Modal open={open} onClose={close} title="Compose Newsletter" subtitle="Published to every ADLG">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    mutation.mutate();
                }}
            >
                <Field label="Subject">
                    <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} required />
                </Field>
                <Field label="Message">
                    <Textarea value={body} onChange={(e) => setBody(e.target.value)} required />
                </Field>
                <Field label="Priority">
                    <Select value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="normal">Normal</option>
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
                    <input type="file" onChange={(e) => setAttachment(e.target.files[0])} />
                </Field>

                <ErrorText>{error}</ErrorText>

                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Publishing…' : 'Publish Newsletter'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Newsletters() {
    const [modalOpen, setModalOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['newsletters'],
        queryFn: () => client.get('/api/admin/newsletters').then((r) => r.data.data),
    });

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Newsletters &amp; Directives</h1>
                <Button variant="accent" onClick={() => setModalOpen(true)}>
                    ✍️ Compose Newsletter
                </Button>
            </div>

            {isLoading ? (
                <FullScreenSpinner />
            ) : data.length === 0 ? (
                <EmptyState icon="📰" title="No newsletters published yet" />
            ) : (
                <div className="space-y-3">
                    {data.map((n) => (
                        <Card key={n.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="text-sm font-semibold text-ink">{n.subject}</div>
                                <Badge tone={priorityTone[n.priority]}>{n.priority}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-ink-muted">{n.body}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {n.options?.map((o) => (
                                    <Badge key={o.id} tone="neutral">
                                        {o.label}
                                    </Badge>
                                ))}
                            </div>
                            <div className="mt-3 flex items-center justify-between text-xs text-ink-faint">
                                <span>{new Date(n.published_at).toLocaleString()}</span>
                                <span>{n.response_count} response(s)</span>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <ComposeModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
    );
}
