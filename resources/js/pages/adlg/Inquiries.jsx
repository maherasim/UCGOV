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
    FileInput,
    FullScreenSpinner,
    Modal,
    Select,
    Textarea,
    TextInput,
} from '../../components/ui';

function SubmitInquiryModal({ open, onClose }) {
    const queryClient = useQueryClient();
    const [subject, setSubject] = useState('');
    const [unionCouncilId, setUnionCouncilId] = useState('');
    const [remarks, setRemarks] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const ucs = useQuery({
        queryKey: ['adlg-union-councils'],
        queryFn: () => client.get('/api/adlg/union-councils').then((r) => r.data.data),
        enabled: open,
    });

    const close = () => {
        setSubject('');
        setUnionCouncilId('');
        setRemarks('');
        setFile(null);
        setError('');
        onClose();
    };

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('subject', subject);
            if (unionCouncilId) formData.append('union_council_id', unionCouncilId);
            formData.append('remarks', remarks);
            formData.append('file', file);
            return client.post('/api/adlg/inquiries', formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adlg-inquiries'] });
            close();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not submit inquiry.'),
    });

    return (
        <Modal open={open} onClose={close} title="Submit Inquiry Request">
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!file) {
                        setError('Please attach the inquiry PDF.');
                        return;
                    }
                    mutation.mutate();
                }}
            >
                <Field label="Subject">
                    <TextInput value={subject} onChange={(e) => setSubject(e.target.value)} required autoFocus />
                </Field>
                <Field label="Union Council (optional)">
                    <Select value={unionCouncilId} onChange={(e) => setUnionCouncilId(e.target.value)}>
                        <option value="">Not specific to a UC</option>
                        {ucs.data?.map((u) => (
                            <option key={u.id} value={u.id}>
                                {u.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label="Remarks / Summary">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} required />
                </Field>
                <Field label="Inquiry File (PDF)">
                    <FileInput value={file} onChange={setFile} accept=".pdf" hint="PDF up to 10MB" />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Submitting…' : 'Submit to Super Admin'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Inquiries() {
    const [modalOpen, setModalOpen] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['adlg-inquiries'],
        queryFn: () => client.get('/api/adlg/inquiries').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between">
                <h1 className="text-xl font-bold text-ink">Inquiry Requests</h1>
                <Button onClick={() => setModalOpen(true)}>+ Submit New Inquiry</Button>
            </div>
            <p className="mb-4 text-sm text-ink-muted">
                Upload your inquiry file with remarks — Super Admin will draft the formal report.
            </p>

            {data.length === 0 ? (
                <EmptyState icon="📄" title="No inquiries submitted yet" />
            ) : (
                <div className="space-y-3">
                    {data.map((i) => (
                        <Card key={i.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-ink">{i.subject}</div>
                                    <div className="text-xs text-ink-muted">
                                        {i.ref} · {i.union_council || 'General'}
                                    </div>
                                </div>
                                <Badge tone={i.status === 'DRAFTED' ? 'success' : 'accent'}>{i.status}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-ink-muted">{i.remarks}</p>
                            <div className="mt-3 flex items-center gap-3">
                                {i.file_url && (
                                    <a href={i.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600">
                                        📎 My File
                                    </a>
                                )}
                                {i.report_file_url && (
                                    <a href={i.report_file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600">
                                        📥 Download Report
                                    </a>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <SubmitInquiryModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
    );
}
