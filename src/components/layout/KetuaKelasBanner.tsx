import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Crown, Timer, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { differenceInDays, differenceInHours, differenceInMinutes, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

export default function KetuaKelasBanner() {
    const { profile, roles } = useAuth();
    const [timeLeft, setTimeLeft] = useState<string>('');

    const isKetuaKelas = roles.includes('ketua_kelas');
    const tenureEndsAt = profile?.tenure_ends_at;

    useEffect(() => {
        if (!isKetuaKelas || !tenureEndsAt) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const end = parseISO(tenureEndsAt);

            const days = differenceInDays(end, now);
            const hours = differenceInHours(end, now) % 24;
            const minutes = differenceInMinutes(end, now) % 60;

            if (days < 0) {
                setTimeLeft('Masa jabatan telah berakhir');
                return;
            }

            let timeString = '';
            if (days > 0) timeString += `${days} hari `;
            if (hours > 0 || days > 0) timeString += `${hours} jam `;
            timeString += `${minutes} menit`;

            setTimeLeft(timeString);
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

        return () => clearInterval(timer);
    }, [isKetuaKelas, tenureEndsAt]);

    if (!isKetuaKelas) return null;

    return (
        <div className="px-6 py-4 animate-in slide-in-from-top duration-500">
            <Alert className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/50 shadow-lg shadow-amber-500/5 backdrop-blur-sm">
                <Crown className="h-5 w-5 text-amber-500" />
                <AlertTitle className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-2 text-base">
                    Status: Ketua Kelas
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        Aktif
                    </span>
                </AlertTitle>
                <AlertDescription className="text-amber-800/80 dark:text-amber-300/80 flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mt-1">
                    <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        <span>Masa Jabatan Sisa: <span className="font-semibold text-amber-600 dark:text-amber-400">{timeLeft}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-xs opacity-70">
                        <Info className="h-3 w-3" />
                        <span>Berakhir pada: {tenureEndsAt ? new Date(tenureEndsAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
}
