import { LucideIcon, SearchX } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    className?: string;
}

export function EmptyState({
    icon: Icon = SearchX,
    title,
    description,
    className = ""
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
            <div className="bg-muted/50 p-6 rounded-full mb-4">
                <Icon className="h-12 w-12 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
                <p className="text-muted-foreground mt-1 max-w-[250px]">
                    {description}
                </p>
            )}
        </div>
    );
}
