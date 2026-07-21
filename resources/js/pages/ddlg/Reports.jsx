import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { APP_BASE_PATH } from '../../utils/basePath';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Button, Card, FullScreenSpinner, Modal } from '../../components/ui';

function ReportDetailModal({ report, onClose }) {
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
                            className="inline-block text-xs font-semibold text-primary-600 hover:underline"
                        >
                            📎 View Attachment
                        </a>
                    )}
                </div>
            )}
        </Modal>
    );
}

export default function Reports() {
    useEffect(() => setLastModule('rep'), []);

    const [viewing, setViewing] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-reports'],
        queryFn: () => client.get('/api/ddlg/reports').then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Daily Reports</h1>
                    <p className="text-sm text-ink-muted">Every report across your district — view only</p>
                </div>
                <Button variant="ghost" onClick={() => window.open(`${APP_BASE_PATH}/api/ddlg/reports/export`, '_blank')}>
                    📊 Export Excel
                </Button>
            </div>

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
                                <button
                                    onClick={() => setViewing(row)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="View Details"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <ReportDetailModal report={viewing} onClose={() => setViewing(null)} />
        </div>
    );
}
