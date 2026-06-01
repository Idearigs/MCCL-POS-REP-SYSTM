import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { repairService } from '@/services/repairService';
import { customerService } from '@/services/customerService';
import {
  ArrowLeft, CheckCircle, Plus, RefreshCw,
  Shuffle, Camera, ImagePlus, X,
} from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
}

const emptyForm = {
  // Customer
  customerSearch: '',
  customerName: '',
  phone: '',
  email: '',
  // Job
  repairId: '',
  itemDescription: '',
  estimatedPrice: '',
  dueDate: '',
  notes: '',
};

function generateRef(): string {
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `RMA-${yy}${mm}-${rand}`;
}

export default function MobileAddRepair() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [successFlash, setSuccessFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const fetchCustomers = () => {
    customerService.getCustomers()
      .then(r => setCustomers(Array.isArray(r) ? r : (r as any).data || []))
      .catch(() => {});
  };

  // Initial load
  useEffect(() => { fetchCustomers(); }, []);

  // Re-fetch whenever the user navigates back to this page (tab becomes visible)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchCustomers();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const set = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const val = e.target.value;
      setForm(f => ({ ...f, [field]: val }));
      if (field === 'customerSearch') {
        if (val.trim().length > 0) {
          const q = val.toLowerCase();
          setCustomerResults(
            customers.filter(c =>
              `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
              (c.phone || '').includes(q) ||
              (c.email || '').toLowerCase().includes(q)
            ).slice(0, 6)
          );
          setShowDropdown(true);
        } else {
          setShowDropdown(false);
        }
      }
    };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setForm(f => ({
      ...f,
      customerSearch: `${c.firstName} ${c.lastName}`,
      customerName: `${c.firstName} ${c.lastName}`,
      phone: c.phone || '',
      email: c.email || '',
    }));
    setShowDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setForm(f => ({ ...f, customerSearch: '', customerName: '', phone: '', email: '' }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remaining = 5 - photoFiles.length;
    const toAdd = files.slice(0, remaining);
    setPhotoFiles(prev => [...prev, ...toAdd]);
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreviews(prev => [...prev, ev.target?.result as string]);
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removePhoto = (i: number) => {
    setPhotoFiles(prev => prev.filter((_, idx) => idx !== i));
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.customerName.trim() || form.customerSearch.trim();
    if (!name && !selectedCustomer) return setError('Customer name or selection is required.');
    if (!form.itemDescription.trim()) return setError('Item description is required.');
    if (!form.estimatedPrice || Number(form.estimatedPrice) < 0) return setError('Estimated price is required.');
    if (!form.dueDate) return setError('Due date is required.');

    setSubmitting(true);
    try {
      let customerId = selectedCustomer?.id;

      if (!customerId) {
        const parts = name.split(' ');
        const newCustomer = await customerService.createCustomer({
          firstName: parts[0] || '',
          lastName: parts.slice(1).join(' ') || 'Customer',
          phone: form.phone || '',
          email: form.email || undefined,
          notes: 'Created via mobile repair add',
          dataProcessingConsent: true,
          marketingEmail: false,
          marketingSms: false,
          marketingPhone: false,
        });
        customerId = newCustomer.id;
      }

      const newRepair = await repairService.createRepair({
        customerId,
        problemDescription: form.notes || 'Repair required',
        priority: 'NORMAL',
        expectedCompletionDate: form.dueDate,
        customerInstructions: form.notes || '',
        rmaId: form.repairId.trim() || undefined,
        items: [{
          itemDescription: form.itemDescription.trim(),
          repairType: 'OTHER',
          repairDescription: form.notes || 'General repair',
          estimatedCost: Number(form.estimatedPrice) || 0,
        }],
      });

      console.log('[MobileAddRepair] Repair created:', newRepair.repairNumber, 'id=', newRepair.id);

      let photoError: string | null = null;
      if (photoFiles.length > 0) {
        try {
          await repairService.uploadRepairImages(newRepair.id, photoFiles, 'before');
        } catch (uploadErr: any) {
          console.error('[MobileAddRepair] Photo upload failed for repair', newRepair.id, uploadErr);
          photoError = `${newRepair.repairNumber || newRepair.id} created — photos failed (${uploadErr?.statusCode ?? uploadErr?.message ?? 'error'}). Open the repair to add photos.`;
        }
      }

      setAddedCount(c => c + 1);
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 1800);

      // Reset form, keep customer for quick repeat
      setForm(f => ({
        ...emptyForm,
        customerSearch: f.customerSearch,
        customerName: f.customerName,
        phone: f.phone,
        email: f.email,
      }));
      setPhotoFiles([]);
      setPhotoPreviews([]);

      if (photoError) setError(photoError);
    } catch (err: any) {
      setError(err?.message || 'Failed to create repair job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/repairs')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">New Repair Job</h1>
            <p className="text-xs text-gray-500 truncate">
              {user?.name ?? 'Staff'} · {addedCount > 0 ? `${addedCount} created this session` : 'Mobile quick-add'}
            </p>
          </div>
          {addedCount > 0 && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200 flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              {addedCount}
            </div>
          )}
        </div>
        <div
          className="h-1 bg-violet-500 transition-all duration-500 ease-out"
          style={{ width: successFlash ? '100%' : '0%', opacity: successFlash ? 1 : 0 }}
        />
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 space-y-5 pb-32">

        {error && (
          <div className={`text-sm px-4 py-3 rounded-xl ${
            error.includes('Repair created')
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* ── Customer ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Customer</p>
          </div>
          <div className="divide-y divide-gray-100">

            {/* Search / Name */}
            <div className="px-4 py-3 relative">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Search or Enter Name <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="text"
                  value={form.customerSearch}
                  onChange={set('customerSearch')}
                  onFocus={() => { fetchCustomers(); if (form.customerSearch.trim()) setShowDropdown(true); }}
                  placeholder="Name, phone or email…"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                  autoComplete="off"
                />
                {selectedCustomer && (
                  <button type="button" onClick={clearCustomer} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {showDropdown && customerResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 bg-white border border-gray-200 rounded-b-2xl shadow-lg overflow-hidden">
                  {customerResults.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onMouseDown={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-3 hover:bg-violet-50 active:bg-violet-100 border-b border-gray-100 last:border-0"
                    >
                      <p className="text-sm font-semibold text-gray-900">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-gray-400">{c.phone || c.email || 'No contact'}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedCustomer && (
                <div className="mt-2 inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 text-xs font-medium px-2.5 py-1 rounded-full border border-violet-200">
                  <CheckCircle className="w-3 h-3" />
                  Existing customer
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. 07911 123456"
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              />
            </div>

            {/* Email */}
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</label>
              <input
                type="email"
                inputMode="email"
                value={form.email}
                onChange={set('email')}
                placeholder="e.g. jane@example.com"
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              />
            </div>
          </div>
        </section>

        {/* ── Job Details ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Job Details</p>
          </div>
          <div className="divide-y divide-gray-100">

            {/* Repair ID */}
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Repair ID / Reference</label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="text"
                  value={form.repairId}
                  onChange={set('repairId')}
                  placeholder="e.g. RMA-2024-001"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, repairId: generateRef() }))}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-violet-50 text-violet-600 active:bg-violet-100"
                  title="Auto-generate reference"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Item Description */}
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Item Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.itemDescription}
                onChange={set('itemDescription')}
                placeholder="e.g. Gold ring with broken clasp"
                rows={2}
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none resize-none placeholder:text-gray-300"
              />
            </div>

            {/* Notes */}
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes / Instructions</label>
              <textarea
                value={form.notes}
                onChange={set('notes')}
                placeholder="Customer instructions or internal notes…"
                rows={2}
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none resize-none placeholder:text-gray-300"
              />
            </div>
          </div>
        </section>

        {/* ── Pricing & Date ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pricing & Date</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Est. Price <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-gray-400 text-base">£</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.estimatedPrice}
                  onChange={set('estimatedPrice')}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Due Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={set('dueDate')}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none"
              />
            </div>
          </div>
        </section>

        {/* ── Photos ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Item Photos <span className="font-normal text-gray-300 normal-case">({photoFiles.length}/5)</span>
            </p>
          </div>
          <div className="px-4 py-4">
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square">
                    <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoFiles.length < 5 && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50 text-violet-600 active:bg-violet-100 transition-colors"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-sm font-semibold">Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 active:bg-gray-100 transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-sm font-semibold">From Gallery</span>
                </button>
              </div>
            )}

            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </div>
        </section>

      </form>

      {/* ── Sticky Submit ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98]"
          style={{
            background: submitting ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            boxShadow: submitting ? 'none' : '0 4px 16px rgba(124,58,237,0.4)',
          }}
        >
          {submitting ? (
            <><RefreshCw className="w-5 h-5 animate-spin" /> Creating…</>
          ) : successFlash ? (
            <><CheckCircle className="w-5 h-5" /> Created! Add another?</>
          ) : (
            <><Plus className="w-5 h-5" /> Create Repair Job</>
          )}
        </button>
      </div>
    </div>
  );
}
