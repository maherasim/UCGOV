import DklicKnowledge from '../../components/DklicKnowledge';

export default function Dklic() {
    return (
        <div>
            <div className="mb-4">
                <h1 className="text-xl font-bold text-ink">Knowledge Centre</h1>
                <p className="text-sm text-ink-muted">DKLIC — Digital Knowledge, Legal Intelligence &amp; Notifications Centre</p>
            </div>
            <DklicKnowledge role="sec" />
        </div>
    );
}
