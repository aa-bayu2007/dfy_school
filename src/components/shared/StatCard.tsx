import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    colorClass?: string;
    bgColorClass?: string;
    className?: string;
}

export function StatCard({
    title,
    value,
    icon: Icon,
    colorClass = "text-primary",
    bgColorClass = "bg-primary/10",
    className
}: StatCardProps) {
    return (
        <Card className={cn("shadow-elegant", className)}>
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">{title}</p>
                        <p className="text-3xl font-bold">{value}</p>
                    </div>
                    <div className={cn("p-3 rounded-full", bgColorClass)}>
                        <Icon className={cn("h-6 w-6", colorClass)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
