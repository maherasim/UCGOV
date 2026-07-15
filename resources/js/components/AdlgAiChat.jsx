import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import { Button, Card, TextInput } from './ui';

const SUGGESTIONS = [
    'How many UCs in my tehsil?',
    "Today's attendance summary",
    'Active divorce cases',
    'Show vacant UCs',
    'Secretaries who haven\'t submitted reports',
    'Case urgency status',
];

/**
 * Answers questions about the ADLG's own dashboard data (UCs, attendance, cases, reports,
 * secretaries) — not a document-search assistant like DKLIC. See AdlgAiController.
 */
export default function AdlgAiChat() {
    const [messages, setMessages] = useState([
        {
            role: 'bot',
            text: 'Hello! I’m your ADLG AI Assistant. I can answer questions about your UC data, attendance, divorce/khula cases, secretary profiles, and more. How can I help?',
        },
    ]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, thinking]);

    const mutation = useMutation({
        mutationFn: (question) => client.post('/api/adlg/ai/ask', { question }).then((r) => r.data),
        onMutate: () => setThinking(true),
        onSuccess: (data) => setMessages((m) => [...m, { role: 'bot', text: data.answer }]),
        onError: (err) =>
            setMessages((m) => [...m, { role: 'bot', text: err.response?.data?.message || 'Something went wrong. Please try again.' }]),
        onSettled: () => setThinking(false),
    });

    const ask = (q) => {
        const question = (q ?? input).trim();
        if (!question || thinking) return;
        setMessages((m) => [...m, { role: 'user', text: question }]);
        setInput('');
        mutation.mutate(question);
    };

    return (
        <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-2.5 border-b border-border bg-primary-50 px-5 py-3.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-white">
                    <SparklesIcon className="h-4 w-4" />
                </div>
                <div>
                    <div className="text-sm font-bold text-ink">ADLG AI Assistant</div>
                    <div className="text-xs text-ink-muted">Answers computed from your own tehsil's live data</div>
                </div>
            </div>

            <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : ''}`}>
                        <div
                            className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                m.role === 'user'
                                    ? 'rounded-tr-sm bg-primary-500 text-white'
                                    : 'rounded-tl-sm border border-border bg-surface-subtle text-ink'
                            }`}
                        >
                            {m.role === 'bot' ? <span dangerouslySetInnerHTML={{ __html: m.text }} /> : m.text}
                        </div>
                    </div>
                ))}
                {thinking && (
                    <div className="flex">
                        <div className="rounded-2xl rounded-tl-sm border border-border bg-surface-subtle px-3.5 py-2.5 text-sm text-ink-muted">
                            ⏳ Analysing your dashboard data…
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
                    placeholder="Ask about UCs, attendance, cases, reports…"
                    disabled={thinking}
                />
                <Button type="submit" disabled={thinking || !input.trim()} className="flex-shrink-0">
                    <PaperAirplaneIcon className="h-4 w-4" />
                </Button>
            </form>
        </Card>
    );
}
