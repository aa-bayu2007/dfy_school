import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceStats } from '@/hooks/useAttendance';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardList, Download, FileSpreadsheet, FileText as FilePdf } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Class } from '@/types/database';

export default function RekapAbsensi() {
  const { roles } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*').order('name');
      if (error) throw error;
      return data as Class[];
    },
  });

  const { data: stats, isLoading } = useAttendanceStats(
    selectedClass || undefined,
    selectedMonth,
    selectedYear
  );

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const exportToExcel = () => {
    if (!stats || stats.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(
      stats.map((s: any, idx: number) => ({
        No: idx + 1,
        Nama: s.student?.full_name || '-',
        NIS: s.student?.nis || '-',
        Kelas: s.student?.class?.name || '-',
        Hadir: s.hadir,
        Sakit: s.sakit,
        Izin: s.izin,
        Alpha: s.alpha,
        Total: s.total,
        'Persentase Kehadiran': `${((s.hadir / s.total) * 100).toFixed(1)}%`,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
    XLSX.writeFile(workbook, `rekap-absensi-${months[selectedMonth]}-${selectedYear}.xlsx`);
  };

  const exportToPDF = () => {
    if (!stats || stats.length === 0) return;

    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Rekap Absensi', 14, 22);
    doc.setFontSize(10);
    doc.text(`Periode: ${months[selectedMonth]} ${selectedYear}`, 14, 30);

    autoTable(doc, {
      startY: 40,
      head: [['No', 'Nama', 'NIS', 'Hadir', 'Sakit', 'Izin', 'Alpha', '%']],
      body: stats.map((s: any, idx: number) => [
        idx + 1,
        s.student?.full_name || '-',
        s.student?.nis || '-',
        s.hadir,
        s.sakit,
        s.izin,
        s.alpha,
        `${((s.hadir / s.total) * 100).toFixed(1)}%`,
      ]),
    });

    doc.save(`rekap-absensi-${months[selectedMonth]}-${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Rekap Absensi
        </h1>
        <p className="text-muted-foreground">
          Lihat dan export rekap kehadiran bulanan
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Kelas</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Pilih Kelas" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} - {cls.grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bulan</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(v) => setSelectedMonth(parseInt(v))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, idx) => (
                    <SelectItem key={idx} value={idx.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tahun</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={exportToExcel} disabled={!stats?.length}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={exportToPDF} disabled={!stats?.length}>
                <FilePdf className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Table */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Data Kehadiran</CardTitle>
          <CardDescription>
            {stats?.length || 0} siswa • {months[selectedMonth]} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Pilih kelas untuk melihat rekap absensi
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats && stats.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIS</TableHead>
                    <TableHead className="text-center">Hadir</TableHead>
                    <TableHead className="text-center">Sakit</TableHead>
                    <TableHead className="text-center">Izin</TableHead>
                    <TableHead className="text-center">Alpha</TableHead>
                    <TableHead className="text-center">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.map((s: any, idx: number) => (
                    <TableRow key={s.student?.id || idx}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{s.student?.full_name}</TableCell>
                      <TableCell>{s.student?.nis || '-'}</TableCell>
                      <TableCell className="text-center text-success font-medium">
                        {s.hadir}
                      </TableCell>
                      <TableCell className="text-center">{s.sakit}</TableCell>
                      <TableCell className="text-center text-warning font-medium">
                        {s.izin}
                      </TableCell>
                      <TableCell className="text-center text-destructive font-medium">
                        {s.alpha}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {s.total > 0 ? `${((s.hadir / s.total) * 100).toFixed(1)}%` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Tidak ada data absensi untuk periode ini
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
