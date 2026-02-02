import { useAuth } from '@/contexts/AuthContext';
import { useSchedulesByDay } from '@/hooks/useSchedules';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BookOpen, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function JadwalPelajaran() {
  const { profile } = useAuth();
  const { data: schedulesByDay, isLoading, rawData } = useSchedulesByDay(profile?.class_id || undefined);

  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile?.class_id) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Belum Ada Kelas</h2>
        <p className="text-muted-foreground text-center">
          Anda belum terdaftar di kelas manapun. Hubungi admin untuk mendaftarkan kelas Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary" />
          Jadwal Pelajaran
        </h1>
        <p className="text-muted-foreground">
          Kelas {profile?.class?.name} - {profile?.class?.grade}
        </p>
      </div>

      <Tabs defaultValue={today} className="w-full">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted p-1">
          {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
            <TabsTrigger
              key={day}
              value={day}
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {day}
            </TabsTrigger>
          ))}
        </TabsList>

        {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => {
          const daySchedule = schedulesByDay.find((d) => d.nama_hari === day);
          
          return (
            <TabsContent key={day} value={day} className="mt-6">
              {daySchedule && daySchedule.jadwal.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {daySchedule.jadwal.map((jadwal, index) => (
                    <Card
                      key={jadwal.id}
                      className={`shadow-elegant transition-all hover:scale-[1.02] ${
                        day === today ? 'ring-2 ring-primary/20' : ''
                      }`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Jam ke-{index + 1}
                          </Badge>
                          {day === today && (
                            <Badge className="bg-primary/10 text-primary text-xs">Hari Ini</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mt-2">{jadwal.mapel}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{jadwal.jam}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{jadwal.guru}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Tidak ada jadwal pelajaran untuk hari {day}
                  </p>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
