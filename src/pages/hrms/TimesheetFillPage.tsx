import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Lock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api/v1';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const ENTRY_TYPES = ['REGULAR', 'OVERTIME', 'SICK', 'ANNUAL_LEAVE', 'BANK_HOLIDAY', 'TRAINING', 'UNPAID'];

interface TokenInfo {
  employeeName: string;
  employeeNumber: string;
  weekStart: string;
  weekEnd: string;
  status: string;
}

interface DayEntry {
  entryDate: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  entryType: string;
  notes: string;
}

function calcHours(start: string, end: string, breakMin: number): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm) - breakMin;
  return Math.max(0, Math.round((total / 60) * 100) / 100);
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekDays(weekStart: string): string[] {
  const monday = new Date(weekStart + 'T00:00:00Z');
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(d.getUTCDate() + i);
    return isoDate(d);
  });
}

type Step = 'loading' | 'error' | 'pin' | 'fill' | 'submitting' | 'done';

export default function TimesheetFillPage() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);

  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');

  const [entries, setEntries] = useState<DayEntry[]>([]);

  // Load token info on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/hrms/attendance/public/${token}`)
      .then((r) => {
        if (!r.ok) return r.json().then((e) => Promise.reject(e.message || 'Link invalid'));
        return r.json();
      })
      .then((info: TokenInfo) => {
        setTokenInfo(info);
        const days = getWeekDays(info.weekStart.split('T')[0]);
        setEntries(
          days.map((d) => ({
            entryDate: d,
            startTime: '',
            endTime: '',
            breakMinutes: 30,
            entryType: 'REGULAR',
            notes: '',
          })),
        );
        setStep('pin');
      })
      .catch((msg: string) => {
        setErrorMsg(typeof msg === 'string' ? msg : 'This link is invalid or expired.');
        setStep('error');
      });
  }, [token]);

  function handlePinNext() {
    if (pin.length < 4) {
      setPinError('PIN must be at least 4 characters');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('PINs do not match');
      return;
    }
    setPinError('');
    setStep('fill');
  }

  function updateEntry(index: number, field: keyof DayEntry, value: string | number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)),
    );
  }

  async function handleSubmit() {
    setStep('submitting');
    try {
      const payload = {
        pin,
        entries: entries.map((e) => ({
          ...e,
          breakMinutes: Number(e.breakMinutes),
          hoursWorked: calcHours(e.startTime, e.endTime, Number(e.breakMinutes)),
        })),
      };

      const resp = await fetch(`${API_BASE}/hrms/attendance/public/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.message || 'Submission failed');
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet-${tokenInfo?.employeeNumber || 'employee'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setStep('done');
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong');
      setStep('error');
    }
  }

  const totalHours = entries.reduce(
    (sum, e) => sum + calcHours(e.startTime, e.endTime, Number(e.breakMinutes)),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Weekly Timesheet</h1>
          <p className="text-gray-500 text-sm mt-1">Self-service portal</p>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {step === 'error' && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 gap-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-red-600 font-medium text-center">{errorMsg}</p>
              <p className="text-gray-500 text-sm text-center">
                Contact your manager for a new timesheet link.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Set PIN */}
        {step === 'pin' && tokenInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Set Your Timesheet PIN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900">{tokenInfo.employeeName}</p>
                <p className="text-xs text-blue-700">#{tokenInfo.employeeNumber}</p>
                <p className="text-xs text-blue-700 mt-1">
                  Week: {tokenInfo.weekStart.split('T')[0]} →{' '}
                  {tokenInfo.weekEnd.split('T')[0]}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                Choose a PIN to protect your exported PDF. The owner will need this PIN to
                open your timesheet.
              </p>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="pin">PIN (minimum 4 characters)</Label>
                  <Input
                    id="pin"
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pin-confirm">Confirm PIN</Label>
                  <Input
                    id="pin-confirm"
                    type="password"
                    placeholder="Repeat PIN"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    className="mt-1"
                    onKeyDown={(e) => e.key === 'Enter' && handlePinNext()}
                  />
                </div>
                {pinError && (
                  <p className="text-sm text-red-600">{pinError}</p>
                )}
              </div>

              <Button onClick={handlePinNext} className="w-full">
                Continue to Timesheet
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Fill hours */}
        {step === 'fill' && tokenInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Fill Your Hours</CardTitle>
              <p className="text-sm text-gray-500">
                {tokenInfo.employeeName} — week of {tokenInfo.weekStart.split('T')[0]}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.map((entry, i) => (
                <div
                  key={entry.entryDate}
                  className="border rounded-lg p-3 space-y-2 bg-white"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {DAY_NAMES[i]}{' '}
                      <span className="text-gray-400 font-normal">
                        {entry.entryDate.slice(5)}
                      </span>
                    </p>
                    <span className="text-xs text-blue-600 font-medium">
                      {calcHours(entry.startTime, entry.endTime, Number(entry.breakMinutes))}h
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Start</Label>
                      <Input
                        type="time"
                        value={entry.startTime}
                        onChange={(e) => updateEntry(i, 'startTime', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">End</Label>
                      <Input
                        type="time"
                        value={entry.endTime}
                        onChange={(e) => updateEntry(i, 'endTime', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Break (min)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={480}
                        value={entry.breakMinutes}
                        onChange={(e) => updateEntry(i, 'breakMinutes', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Type</Label>
                      <Select
                        value={entry.entryType}
                        onValueChange={(v) => updateEntry(i, 'entryType', v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTRY_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Notes (optional)</Label>
                    <Input
                      value={entry.notes}
                      onChange={(e) => updateEntry(i, 'notes', e.target.value)}
                      placeholder="Any notes..."
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2 border-t">
                <p className="font-semibold text-gray-700">
                  Total: <span className="text-blue-600">{totalHours.toFixed(2)}h</span>
                </p>
                <Button onClick={handleSubmit} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Submit & Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submitting */}
        {step === 'submitting' && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
              <p className="text-gray-600">Generating your PIN-protected PDF…</p>
            </CardContent>
          </Card>
        )}

        {/* Done */}
        {step === 'done' && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 gap-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold text-gray-900">Timesheet Submitted</h2>
              <p className="text-gray-500 text-center text-sm">
                Your timesheet has been saved and the PDF has downloaded automatically.
                The PDF is protected with your chosen PIN — share it with your manager.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
