import { AiAssistant } from '../../components/DklicKnowledge';

export default function Chatbot() {
    return (
        <div>
            <div className="mb-4">
                <h1 className="text-xl font-bold text-ink">Local Government Chatbot</h1>
                <p className="text-sm text-ink-muted">Ask questions — answers are sourced exclusively from the DKLIC Knowledge Repository</p>
            </div>
            <AiAssistant role="adlg" />
        </div>
    );
}
