import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alpha' | 'pending' | string;

interface StatusBadgeProps {
    status: AttendanceStatus;
    className?: string; // Additional classes for positioning
    showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
    const s = status.toLowerCase();

    switch (s) {
        case 'hadir':
            return (
                <Badge className={cn("bg-success text-success-foreground hover:bg-success/90", className)}>
                    {showIcon && <CheckCircle className="h-3 w-3 mr-1" />}
                    Hadir
                </Badge>
            );
        case 'sakit':
            return (
                <Badge className={cn("bg-blue-500 text-white hover:bg-blue-600", className)}>
                    {showIcon && <AlertCircle className="h-3 w-3 mr-1" />}
                    Sakit
                </Badge>
            );
        case 'izin':
            return (
                <Badge className={cn("bg-amber-500 text-white hover:bg-amber-600", className)}>
                    {showIcon && <Clock className="h-3 w-3 mr-1" />}
                    Izin
                </Badge>
            );
        case 'alpha':
            return (
                <Badge variant="destructive" className={className}>
                    {showIcon && <XCircle className="h-3 w-3 mr-1" />}
                    Alpha
                </Badge>
            );
        case 'approved':
            return (
                <Badge className={cn("bg-success text-success-foreground hover:bg-success/90", className)}>
                    {showIcon && <CheckCircle className="h-3 w-3 mr-1" />}
                    Disetujui
                </Badge>
            );
        case 'rejected':
            return (
                <Badge variant="destructive" className={className}>
                    {showIcon && <XCircle className="h-3 w-3 mr-1" />}
                    Ditolak
                </Badge>
            );
        case 'pending':
        default:
            return (
                <Badge variant="secondary" className={className}>
                    {showIcon && <Clock className="h-3 w-3 mr-1" />}
                    Pending
                </Badge>
            );
    }
}
