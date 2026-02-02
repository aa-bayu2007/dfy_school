import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAttendanceRequests, useCreateAttendanceRequest } from '@/hooks/useAttendanceRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AjukanIzin() {
  const { user } = useAuth();
  const { data: requests, isLoading } = useAttendanceRequests(user?.id);
  const createRequest = useCreateAttendanceRequest();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [type, setType] = useState<'sakit' | 'izin'>('izin');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!date || !reason) {
      toast.error('Lengkapi semua field!');
      return;
    }

    try {
      await createRequest.mutateAsync({
        studentId: user?.id || '',
        date,
        requestType: type,
        reason,
      });
      setOpen(false);
      setDate('');
      setType('izin');
      setReason('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-success text-success-foreground">
            <CheckCircle className="h-3 w-3 mr-1" />
            Disetujui
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Ditolak
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Ajukan Izin/Sakit
          </h1>
          <p className="text-muted-foreground">
            Ajukan permintaan izin atau sakit
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Ajukan Baru
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajukan Izin/Sakit</DialogTitle>
              <DialogDescription>
                Isi form berikut untuk mengajukan izin atau keterangan sakit
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Tanggal</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Jenis</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'sakit' | 'izin')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="sakit">Sakit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Alasan</Label>
                <Textarea
                  id="reason"
                  placeholder="Jelaskan alasan Anda..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createRequest.isPending}
                className="gradient-primary"
              >
                {createRequest.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Kirim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Riwayat Pengajuan</CardTitle>
          <CardDescription>
            {requests?.length || 0} pengajuan izin/sakit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests && requests.length > 0 ? (
            <div className="space-y-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {req.request_type === 'sakit' ? 'Sakit' : 'Izin'}
                      </Badge>
                      {getStatusBadge(req.status)}
                    </div>
                    <p className="font-medium">
                      {new Date(req.date).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">{req.reason}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mt-2 md:mt-0">
                    Diajukan:{' '}
                    {new Date(req.created_at).toLocaleDateString('id-ID')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Belum ada pengajuan izin/sakit
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
