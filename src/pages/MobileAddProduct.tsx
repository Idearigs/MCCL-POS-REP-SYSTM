import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { productService, CreateProductData } from '@/services/productService';
import {
  CheckCircle, Plus, RefreshCw,
  Shuffle, ArrowLeft, Camera, ImagePlus, X, ImageOff,
} from 'lucide-react';

const MATERIALS = [
  'GOLD', 'SILVER', 'PLATINUM', 'DIAMOND',
  'PEARL', 'GEMSTONE', 'STAINLESS_STEEL', 'OTHER',
];

const WATCH_BRANDS = ['Rosefeld', 'Roamer', 'Briston', 'Festina', 'Secondhand'];

const CONDITIONS = ['BRAND_NEW', 'USED'];

const MATERIAL_LABELS: Record<string, string> = {
  GOLD: 'Gold', SILVER: 'Silver', PLATINUM: 'Platinum', DIAMOND: 'Diamond',
  PEARL: 'Pearl', GEMSTONE: 'Gemstone', STAINLESS_STEEL: 'Stainless Steel', OTHER: 'Other',
};

function generateSKU(name: string, material: string): string {
  const prefix = material === 'OTHER' ? 'JWL' : material.slice(0, 3);
  const nameCode = name.replace(/\s+/g, '-').toUpperCase().slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${nameCode}-${rand}`;
}

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  name: '',
  sku: '',
  price: '',
  cost: '',
  weight: '',
  stock: '',
  minStockLevel: '1',
  category: '',
  material: 'GOLD',
  condition: 'BRAND_NEW',
  description: '',
  brand: '',
};

export default function MobileAddProduct() {
  const { user, auth } = useAuth();
  const isBuyme = auth.tenantInfo?.tenantSlug === 'buymejewellery';
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [successFlash, setSuccessFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  const set = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));

  const autoSKU = () => {
    if (!form.name) return;
    setForm(f => ({ ...f, sku: generateSKU(f.name, f.material) }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // reset input so same file can be re-selected
    e.target.value = '';
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('SKU is required. Use the shuffle button to auto-generate.');
    if (!form.price || Number(form.price) < 0) return setError('Selling price is required.');
    if (!form.stock || Number(form.stock) < 0) return setError('Quantity is required.');

    setSubmitting(true);
    try {
      const payload: CreateProductData = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock),
        minStockLevel: Number(form.minStockLevel) || 1,
        category: form.category || '',
        material: form.material,
        description: form.description.trim() || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
      };
      (payload as any).condition = form.condition;
      if (form.brand) (payload as any).supplierName = form.brand;

      const created = await productService.createProduct(payload);

      // Upload photo if one was selected
      if (photoFile && created?.id) {
        setPhotoUploading(true);
        try {
          await productService.uploadProductImage(created.id, photoFile);
        } catch {
          // photo upload failure is non-fatal — product was still created
        } finally {
          setPhotoUploading(false);
        }
      }

      setAddedCount(c => c + 1);
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 1800);
      setForm(f => ({ ...emptyForm, material: f.material, condition: f.condition, category: f.category, brand: f.brand }));
      clearPhoto();
    } catch (err: any) {
      setError(err?.message || 'Failed to add product. Please try again.');
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
            onClick={() => navigate('/inventory')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Add Product</h1>
            <p className="text-xs text-gray-500 truncate">
              {user?.name ?? 'Inventory'} · {addedCount > 0 ? `${addedCount} added this session` : 'Mobile quick-add'}
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
          className="h-1 bg-green-500 transition-all duration-500 ease-out"
          style={{ width: successFlash ? '100%' : '0%', opacity: successFlash ? 1 : 0 }}
        />
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 space-y-5 pb-32">

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* ── Section: Photo ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Product Photo</p>
          </div>
          <div className="px-4 py-4">
            {photoPreview ? (
              /* ── Preview ── */
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="Product preview"
                  className="w-full h-52 object-cover rounded-xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
                >
                  <X className="w-4 h-4" />
                </button>
                {/* Replace buttons below preview */}
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium active:bg-gray-200"
                  >
                    <Camera className="w-4 h-4" />
                    Retake
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium active:bg-gray-200"
                  >
                    <ImagePlus className="w-4 h-4" />
                    Change
                  </button>
                </div>
              </div>
            ) : (
              /* ── No photo yet ── */
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 active:bg-indigo-100 transition-colors"
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

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
        </section>

        {/* ── Section: Product Info ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Product Info</p>
          </div>
          <div className="divide-y divide-gray-100">

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="e.g. Gold Ring 18K"
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                autoComplete="off"
              />
            </div>

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                SKU <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="text"
                  value={form.sku}
                  onChange={set('sku')}
                  placeholder="e.g. GOLD-RING-A1B2"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300 font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={autoSKU}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-600 active:bg-indigo-100"
                  title="Auto-generate SKU"
                >
                  <Shuffle className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
              <textarea
                value={form.description}
                onChange={set('description')}
                placeholder="Optional notes about this item…"
                rows={2}
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none resize-none placeholder:text-gray-300"
              />
            </div>
          </div>
        </section>

        {/* ── Section: Pricing & Stock ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pricing & Stock</p>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-4 py-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Price <span className="text-red-400">*</span>
                </label>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-gray-400 text-base">£</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.price}
                    onChange={set('price')}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="px-4 py-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</label>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-gray-400 text-base">£</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={form.cost}
                    onChange={set('cost')}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (g)</label>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-gray-400 text-base">g</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={form.weight}
                  onChange={set('weight')}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-4 py-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Qty <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={set('stock')}
                  placeholder="0"
                  min="0"
                  className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
              <div className="px-4 py-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reorder At</label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={form.minStockLevel}
                  onChange={set('minStockLevel')}
                  placeholder="1"
                  min="0"
                  className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Classification ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Classification</p>
          </div>
          <div className="divide-y divide-gray-100">

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={set('category')}
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none appearance-none"
              >
                <option value="">— No category —</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Material</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {MATERIALS.map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, material: m }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      form.material === m
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    {MATERIAL_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</label>
              <div className="flex gap-3 mt-2">
                {CONDITIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, condition: c }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      form.condition === c
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    {c === 'BRAND_NEW' ? 'Brand New' : 'Used'}
                  </button>
                ))}
              </div>
            </div>

            {/* Watch Brand — buymejewellery only */}
            {isBuyme && (
              <div className="px-4 py-3">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Watch Brand</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {WATCH_BRANDS.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, brand: f.brand === b ? '' : b }))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        form.brand === b
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Tap to select, tap again to deselect</p>
              </div>
            )}
          </div>
        </section>

      </form>

      {/* ── Sticky Submit Button ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98]"
          style={{
            background: submitting ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            boxShadow: submitting ? 'none' : '0 4px 16px rgba(79,70,229,0.4)',
          }}
        >
          {submitting ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              {photoUploading ? 'Uploading photo…' : 'Saving…'}
            </>
          ) : successFlash ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Added! Add another?
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Add to Inventory
            </>
          )}
        </button>
      </div>
    </div>
  );
}
