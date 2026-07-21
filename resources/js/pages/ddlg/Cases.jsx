import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon } from '@heroicons/react/24/outline';
import client from '../../api/client';
import DataTable from '../../components/DataTable';
import { setLastModule } from '../../utils/lastModule';
import { Badge, Card, FullScreenSpinner, Modal, Select } from '../../components/ui';

const STATUS_TONE = {
    SUBMITTED: 'info',
    SEEN: 'info',
    NOTICE_ISSUED: 'warning',
    ARB_CONSTITUTED: 'warning',
    IN_PROCEEDINGS: 'warning',
    DISPOSED_RECONCILED: 'success',
    DISPOSED_EFFECTIVE: 'success',
    FILED_NON_RESPONSE: 'danger',
};

function CaseDetailModal({ caseId, onClose }) {
    const { data: c, isLoading } = useQuery({
        queryKey: ['ddlg-case', caseId],
        queryFn: () => client.get(`/api/ddlg/cases/${caseId}`).then((r) => r.data.data),
        enabled: !!caseId,
    });

    return (
        <Modal open={!!caseId} onClose={onClose} title={c ? c.case_no : 'Case Detail'} subtitle={c?.union_council}>
            {isLoading || !c ? (
                <FullScreenSpinner />
            ) : (
                <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        <Badge tone="neutral">{c.type === 'divorce' ? '💔 Divorce' : '🏛️ Khula'}</Badge>
                        <Badge tone={STATUS_TONE[c.status]}>{c.status_label}</Badge>
                        {c.is_urgent && <Badge tone="danger">⚠ Urgent</Badge>}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-surface-subtle p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Divorcer</div>
                            <div className="text-sm font-bold text-ink">{c.divorcer_name}</div>
                            <div className="text-xs text-ink-muted">{c.divorcer_cnic}</div>
                        </div>
                        <div className="rounded-xl bg-surface-subtle p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Respondent</div>
                            <div className="text-sm font-bold text-ink">{c.respondent_name}</div>
                            <div className="text-xs text-ink-muted">{c.respondent_cnic}</div>
                        </div>
                    </div>

                    <div className="mb-3 rounded-xl border border-border p-3 text-xs text-ink-muted">
                        <div className="flex justify-between py-0.5"><span>Union Council</span><span className="font-semibold text-ink">{c.union_council}</span></div>
                        <div className="flex justify-between py-0.5"><span>Secretary</span><span className="font-semibold text-ink">{c.secretary}</span></div>
                        <div className="flex justify-between py-0.5"><span>ADLG</span><span className="font-semibold text-ink">{c.adlg || '—'}</span></div>
                        <div className="flex justify-between py-0.5"><span>Receipt Date</span><span className="font-semibold text-ink">{c.receipt_date}</span></div>
                        {c.days_remaining !== null && (
                            <div className="flex justify-between py-0.5"><span>Days Remaining</span><span className="font-semibold text-ink">{c.days_remaining}</span></div>
                        )}
                    </div>

                    {c.notice && (
                        <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-info">Notice</div>
                            <p className="text-xs text-ink">No. {c.notice.notice_no} · Issued {c.notice.issue_date} · Hearing {c.notice.hearing_date}</p>
                        </div>
                    )}

                    {c.arbitration && (
                        <div className="mb-3 rounded-xl border border-border p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Arbitration Council</div>
                            <p className="text-xs text-ink">{c.arbitration.husband_rep_name} ({c.arbitration.husband_rep_designation})</p>
                            <p className="text-xs text-ink">{c.arbitration.wife_rep_name} ({c.arbitration.wife_rep_designation})</p>
                        </div>
                    )}

                    {c.decision && (
                        <div className="mb-3 rounded-xl border border-primary-100 bg-primary-50 p-3">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-primary-700">Final Decision</div>
                            <p className="text-xs text-ink">{c.decision.type} · Order {c.decision.order_no} · {c.decision.decided_at}</p>
                            {c.decision.remarks && <p className="mt-1 text-xs italic text-ink-muted">{c.decision.remarks}</p>}
                        </div>
                    )}

                    {c.timeline?.length > 0 && (
                        <div className="mb-2">
                            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">Timeline</div>
                            {c.timeline.map((t, i) => (
                                <div key={i} className="flex gap-2 py-1 text-xs">
                                    <span className="text-ink-faint">{t.event_date}</span>
                                    <span className="text-ink">{t.note}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}

export default function Cases() {
    useEffect(() => setLastModule('cases'), []);

    const [activeId, setActiveId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['ddlg-cases', statusFilter],
        queryFn: () => client.get('/api/ddlg/cases', { params: { status: statusFilter || undefined } }).then((r) => r.data.data),
    });

    if (isLoading) return <FullScreenSpinner />;

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-ink">Divorce/Khula Cases</h1>
                    <p className="text-sm text-ink-muted">Every case across your district — view only</p>
                </div>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-48">
                    <option value="">All statuses</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="SEEN">Seen</option>
                    <option value="NOTICE_ISSUED">Notice Issued</option>
                    <option value="ARB_CONSTITUTED">Arbitration Constituted</option>
                    <option value="IN_PROCEEDINGS">In Proceedings</option>
                    <option value="DISPOSED_RECONCILED">Disposed — Reconciled</option>
                    <option value="DISPOSED_EFFECTIVE">Disposed — Effective</option>
                    <option value="FILED_NON_RESPONSE">Filed — Non-Response</option>
                </Select>
            </div>

            <Card>
                <DataTable
                    data={data}
                    columns={[
                        { title: 'Case No.', data: 'case_no' },
                        { title: 'Type', data: 'type' },
                        { title: 'UC', data: 'union_council' },
                        { title: 'Divorcer', data: 'divorcer_name' },
                        { title: 'Respondent', data: 'respondent_name' },
                        { title: 'Status', data: 'status_label' },
                        { title: '', data: null, orderable: false, searchable: false, className: 'text-right' },
                    ]}
                    slots={{
                        1: (data) => <Badge tone="neutral">{data === 'divorce' ? '💔 Divorce' : '🏛️ Khula'}</Badge>,
                        5: (data, row) => <Badge tone={STATUS_TONE[row.status]}>{data}</Badge>,
                        6: (data, row) => (
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setActiveId(row.id)}
                                    className="rounded-lg p-1.5 text-ink-muted hover:bg-primary-50 hover:text-primary-600"
                                    aria-label="View"
                                >
                                    <EyeIcon className="h-4 w-4" />
                                </button>
                            </div>
                        ),
                    }}
                />
            </Card>

            <CaseDetailModal caseId={activeId} onClose={() => setActiveId(null)} />
        </div>
    );
}
