import {
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MegaphoneIcon,
    KeyIcon,
    UserMinusIcon,
    CheckIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';
import { timeAgo } from '../utils/timeAgo';

const RULES = [
    { match: /DEACTIVATED/, icon: UserMinusIcon, tone: 'bg-red-50 text-danger' },
    { match: /REACTIVATED/, icon: CheckIcon, tone: 'bg-primary-50 text-primary-600' },
    { match: /CREATED/, icon: PlusIcon, tone: 'bg-primary-50 text-primary-600' },
    { match: /UPDATED|EDITED/, icon: PencilSquareIcon, tone: 'bg-blue-50 text-info' },
    { match: /DELETED/, icon: TrashIcon, tone: 'bg-red-50 text-danger' },
    { match: /NL_PUBLISHED|NEWSLETTER/, icon: MegaphoneIcon, tone: 'bg-accent-100 text-accent-600' },
    { match: /PASSWORD/, icon: KeyIcon, tone: 'bg-accent-100 text-accent-600' },
    { match: /INQ_/, icon: DocumentTextIcon, tone: 'bg-blue-50 text-info' },
];

function actionMeta(action) {
    const rule = RULES.find((r) => r.match.test(action));
    return rule || { icon: ClipboardDocumentListIcon, tone: 'bg-surface-subtle text-ink-muted' };
}

export default function ActivityTimeline({ events, maxHeight = 'max-h-96' }) {
    if (events.length === 0) {
        return <div className="p-6 text-center text-sm text-ink-muted">No activity recorded yet.</div>;
    }

    return (
        <div className={`${maxHeight} overflow-y-auto px-4 py-3`}>
            {events.map((e, i) => {
                const { icon: Icon, tone } = actionMeta(e.action);
                const isLast = i === events.length - 1;

                return (
                    <div key={e.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${tone}`}>
                                <Icon className="h-4 w-4" />
                            </div>
                            {!isLast && <div className="w-px flex-1 bg-border" />}
                        </div>
                        <div className={`min-w-0 flex-1 ${isLast ? 'pb-1' : 'pb-5'}`}>
                            <div className="truncate text-sm font-medium text-ink">{e.note || e.action}</div>
                            <div className="mt-0.5 text-xs text-ink-muted">
                                {e.user || 'System'} · {timeAgo(e.created_at)}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
