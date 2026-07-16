export default function SectionHeader({ title, subtitle, action }) {
    return (
        <div className="mb-3 flex items-start justify-between gap-3">
            <div>
                <h2 className="text-sm font-bold text-ink">{title}</h2>
                {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
            </div>
            {action}
        </div>
    );
}
