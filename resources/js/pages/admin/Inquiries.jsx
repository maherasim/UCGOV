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
    Textarea,
} from '../../components/ui';

function UploadReportModal({ inquiry, onClose }) {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [remarks, setRemarks] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: () => {
            const formData = new FormData();
            formData.append('report_file', file);
            if (remarks) formData.append('report_remarks', remarks);

            return client.post(`/api/admin/inquiries/${inquiry.id}/report`, formData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inquiries'] });
            onClose();
        },
        onError: (err) => setError(err.response?.data?.message || 'Could not upload report.'),
    });

    return (
        <Modal open={!!inquiry} onClose={onClose} title="Upload Final Report" subtitle={inquiry?.subject}>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!file) {
                        setError('Please attach the final report file.');
                        return;
                    }
                    mutation.mutate();
                }}
            >
                <Field label="Final Report (PDF / Word)">
                    <input type="file" onChange={(e) => setFile(e.target.files[0])} accept=".pdf,.doc,.docx" />
                </Field>
                <Field label="Covering Remarks (optional)">
                    <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
                <ErrorText>{error}</ErrorText>
                <Button type="submit" className="mt-2 w-full" disabled={mutation.isPending}>
                    {mutation.isPending ? 'Uploading…' : 'Send Report to ADLG'}
                </Button>
            </form>
        </Modal>
    );
}

export default function Inquiries() {
    const [uploadTarget, setUploadTarget] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['inquiries'],
        queryFn: () => client.get('/api/admin/inquiries').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <h1 className="mb-1 text-xl font-bold text-ink">Inquiry Report Requests</h1>
            <p className="mb-4 text-sm text-ink-muted">
                Review inquiry files submitted by ADLGs, download them, and upload the final report.
            </p>

            {data.length === 0 ? (
                <EmptyState
                    icon="📄"
                    title="No inquiry requests yet"
                    subtitle="These will appear once ADLGs start submitting inquiry files."
                />
            ) : (
                <div className="space-y-3">
                    {data.map((i) => (
                        <Card key={i.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-ink">{i.subject}</div>
                                    <div className="text-xs text-ink-muted">
                                        {i.ref} · {i.adlg} · {i.union_council || 'No UC'}
                                    </div>
                                </div>
                                <Badge tone={i.status === 'DRAFTED' ? 'success' : 'warning'}>{i.status}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-ink-muted">{i.remarks}</p>
                            <div className="mt-3 flex items-center gap-3">
                                {i.file_url && (
                                    <a href={i.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600">
                                        📎 View Inquiry File
                                    </a>
                                )}
                                {i.report_file_url && (
                                    <a href={i.report_file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600">
                                        📥 View Final Report
                                    </a>
                                )}
                                {i.status === 'PENDING' && (
                                    <Button variant="ghost" className="ml-auto" onClick={() => setUploadTarget(i)}>
                                        Upload Report
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <UploadReportModal inquiry={uploadTarget} onClose={() => setUploadTarget(null)} />
        </div>
    );
}
