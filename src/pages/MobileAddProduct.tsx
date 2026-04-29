import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { productService, CreateProductData, Product } from '@/services/productService';
import { normalizeImageUrl } from '@/lib/utils';
import {
  CheckCircle, Plus, RefreshCw, Shuffle, ArrowLeft,
  Camera, ImagePlus, X, Pencil, Search, Package,
  ChevronRight, Save, ImageOff,
} from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────

const METAL_TYPES_MOB = ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD', 'SILVER', 'PLATINUM', 'STAINLESS_STEEL'];
const STONE_TYPES_MOB = ['DIAMOND', 'LAB_DIAMOND', 'MOISSANITE', 'CZ', 'SAPPHIRE', 'RUBY', 'EMERALD', 'AMETHYST', 'PEARL', 'AQUAMARINE', 'TOPAZ', 'OPAL', 'GARNET', 'TOURMALINE'];
const GOLD_TYPES_MOB = new Set(['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD']);
const GOLD_CARATS_MOB = ['9CT', '14CT', '18CT', '22CT', '24CT'];
const DIAMOND_CUTS_MOB = ['Round', 'Princess', 'Oval', 'Pear', 'Cushion', 'Emerald Cut', 'Marquise', 'Radiant', 'Asscher', 'Heart', 'Trillion'];

const WATCH_BRANDS = ['Rosefeld', 'Roamer', 'Briston', 'Festina', 'Secondhand'];
const CONDITIONS = ['BRAND_NEW', 'USED'];

const MATERIAL_LABELS_MOB: Record<string, string> = {
  YELLOW_GOLD: 'Yellow Gold', WHITE_GOLD: 'White Gold', ROSE_GOLD: 'Rose Gold',
  SILVER: 'Silver', PLATINUM: 'Platinum', STAINLESS_STEEL: 'Stainless Steel',
  DIAMOND: 'Diamond', LAB_DIAMOND: 'Lab Diamond', MOISSANITE: 'Moissanite', CZ: 'CZ',
  SAPPHIRE: 'Sapphire', RUBY: 'Ruby', EMERALD: 'Emerald', AMETHYST: 'Amethyst',
  PEARL: 'Pearl', AQUAMARINE: 'Aquamarine', TOPAZ: 'Topaz', OPAL: 'Opal',
  GARNET: 'Garnet', TOURMALINE: 'Tourmaline',
};

const GEM_TO_PRISMA_MOB: Record<string, string> = {
  LAB_DIAMOND: 'DIAMOND', MOISSANITE: 'GEMSTONE', CZ: 'GEMSTONE',
  SAPPHIRE: 'GEMSTONE', RUBY: 'GEMSTONE', EMERALD: 'GEMSTONE', AMETHYST: 'GEMSTONE',
  AQUAMARINE: 'GEMSTONE', TOPAZ: 'GEMSTONE', OPAL: 'GEMSTONE', GARNET: 'GEMSTONE', TOURMALINE: 'GEMSTONE',
};

interface MobMaterialEntry { base: string; carat?: string; detail?: string; }

function mobMaterialLabel(e: MobMaterialEntry): string {
  const base = MATERIAL_LABELS_MOB[e.base] ?? e.base;
  const suffix = [e.carat, e.detail].filter(Boolean).join(' · ');
  return suffix ? `${base} ${suffix}` : base;
}

function parseLegacyMaterialMob(raw: string): MobMaterialEntry {
  for (const base of ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD']) {
    for (const ct of GOLD_CARATS_MOB) {
      if (raw === `${base}_${ct}`) return { base, carat: ct };
    }
    if (raw === base) return { base };
  }
  if (raw === 'GOLD') return { base: 'YELLOW_GOLD' };
  return { base: raw || 'YELLOW_GOLD' };
}

function primaryMaterialStrMob(selected: MobMaterialEntry[]): string {
  const primary = selected.find(m => METAL_TYPES_MOB.includes(m.base)) ?? selected[0];
  if (!primary) return '';
  const prismaBase = GEM_TO_PRISMA_MOB[primary.base] ?? primary.base;
  return primary.carat && GOLD_TYPES_MOB.has(prismaBase) ? `${prismaBase}_${primary.carat}` : prismaBase;
}

function generateSKU(name: string, selected: MobMaterialEntry[]): string {
  const top = selected[0]?.base ?? '';
  const prefix = top.startsWith('YELLOW_GOLD') ? 'YGD'
    : top.startsWith('WHITE_GOLD') ? 'WGD'
    : top.startsWith('ROSE_GOLD') ? 'RGD'
    : top ? top.slice(0, 3) : 'JWL';
  const nameCode = name.replace(/\s+/g, '-').toUpperCase().slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${nameCode}-${rand}`;
}

interface Category { id: string; name: string; }

const emptyForm = {
  name: '', sku: '', price: '', cost: '', weight: '',
  stock: '', minStockLevel: '1', category: '',
  condition: 'BRAND_NEW', description: '', brand: '',
};

type View = 'add' | 'list' | 'edit';

// ─── Photo section (shared between add & edit) ────────────────────────────

interface PhotoSectionProps {
  preview: string | null;
  existingUrl?: string | null;
  onCamera: () => void;
  onGallery: () => void;
  onClear: () => void;
  cameraRef: React.RefObject<HTMLInputElement>;
  galleryRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function PhotoSection({
  preview, existingUrl, onCamera, onGallery, onClear,
  cameraRef, galleryRef, onChange,
}: PhotoSectionProps) {
  const displayUrl = preview ?? existingUrl ?? null;
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Product Photo</p>
      </div>
      <div className="px-4 py-4">
        {displayUrl ? (
          <div className="relative">
            <img
              src={displayUrl}
              alt="Product"
              className="w-full h-52 object-cover rounded-xl border border-gray-200"
            />
            {/* Only show clear button on a NEW selection, not on existing */}
            {preview && (
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white active:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={onCamera}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium active:bg-gray-200"
              >
                <Camera className="w-4 h-4" />
                {preview ? 'Retake' : 'Replace'}
              </button>
              <button
                type="button"
                onClick={onGallery}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium active:bg-gray-200"
              >
                <ImagePlus className="w-4 h-4" />
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCamera}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-600 active:bg-indigo-100"
            >
              <Camera className="w-6 h-6" />
              <span className="text-sm font-semibold">Take Photo</span>
            </button>
            <button
              type="button"
              onClick={onGallery}
              className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 text-gray-500 active:bg-gray-100"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-sm font-semibold">From Gallery</span>
            </button>
          </div>
        )}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onChange} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </div>
    </section>
  );
}

// ─── Product form fields (shared between add & edit) ──────────────────────

interface ProductFormFieldsProps {
  form: typeof emptyForm;
  set: (field: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAutoSKU: () => void;
  categories: Category[];
  isBuyme: boolean;
  selectedMaterials: MobMaterialEntry[];
  setSelectedMaterials: React.Dispatch<React.SetStateAction<MobMaterialEntry[]>>;
  pendingBase: string | null;
  setPendingBase: React.Dispatch<React.SetStateAction<string | null>>;
  pendingCarat: string;
  setPendingCarat: React.Dispatch<React.SetStateAction<string>>;
  pendingCut: string;
  setPendingCut: React.Dispatch<React.SetStateAction<string>>;
}

function ProductFormFields({
  form, set, onAutoSKU, categories, isBuyme,
  selectedMaterials, setSelectedMaterials,
  pendingBase, setPendingBase,
  pendingCarat, setPendingCarat,
  pendingCut, setPendingCut,
}: ProductFormFieldsProps) {
  return (
    <>
      {/* Product Info */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Product Info</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name <span className="text-red-400">*</span></label>
            <input
              type="text" value={form.name} onChange={set('name')}
              placeholder="e.g. Gold Ring 18K"
              className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              autoComplete="off"
            />
          </div>
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU <span className="text-red-400">*</span></label>
            <div className="flex items-center gap-2 mt-1.5">
              <input
                type="text" value={form.sku} onChange={set('sku')}
                placeholder="e.g. GOLD-RING-A1B2"
                className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300 font-mono"
                autoComplete="off"
              />
              <button type="button" onClick={onAutoSKU}
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
              value={form.description} onChange={set('description')}
              placeholder="Optional notes…"
              rows={2}
              className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none resize-none placeholder:text-gray-300"
            />
          </div>
        </div>
      </section>

      {/* Pricing & Stock */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Pricing & Stock</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Price <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-gray-400 text-base">£</span>
                <input type="number" inputMode="decimal" value={form.price} onChange={set('price')}
                  placeholder="0.00" min="0" step="0.01"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cost</label>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="text-gray-400 text-base">£</span>
                <input type="number" inputMode="decimal" value={form.cost} onChange={set('cost')}
                  placeholder="0.00" min="0" step="0.01"
                  className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                />
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Weight (g)</label>
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-gray-400 text-base">g</span>
              <input type="number" inputMode="decimal" value={form.weight} onChange={set('weight')}
                placeholder="0.00" min="0" step="0.01"
                className="flex-1 text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty <span className="text-red-400">*</span></label>
              <input type="number" inputMode="numeric" value={form.stock} onChange={set('stock')}
                placeholder="0" min="0"
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reorder At</label>
              <input type="number" inputMode="numeric" value={form.minStockLevel} onChange={set('minStockLevel')}
                placeholder="1" min="0"
                className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Classification */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Classification</p>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</label>
            <select value={form.category} onChange={set('category')}
              className="mt-1.5 w-full text-base text-gray-900 bg-transparent outline-none appearance-none"
            >
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="px-4 py-3 space-y-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Materials</label>

            {/* Selected pills */}
            {selectedMaterials.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedMaterials.map((entry, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-600 text-white">
                    {mobMaterialLabel(entry)}
                    <button type="button" onClick={() => setSelectedMaterials(prev => prev.filter((_, idx) => idx !== i))} className="ml-0.5 active:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Metals */}
            <p className="text-xs text-gray-400 font-medium">Metals</p>
            <div className="flex flex-wrap gap-2">
              {METAL_TYPES_MOB.map(m => {
                const isSelected = selectedMaterials.some(e => e.base === m);
                const isPending = pendingBase === m;
                return (
                  <span key={m} className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none transition-colors ${isSelected || isPending ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                    onClick={() => {
                      if (GOLD_TYPES_MOB.has(m)) {
                        setPendingBase(isPending ? null : m);
                        setPendingCarat(''); setPendingCut('');
                      } else {
                        setSelectedMaterials(prev => isSelected ? prev.filter(e => e.base !== m) : [...prev, { base: m }]);
                      }
                    }}
                  >{MATERIAL_LABELS_MOB[m]}</span>
                );
              })}
            </div>

            {/* Carat picker for pending gold */}
            {pendingBase && GOLD_TYPES_MOB.has(pendingBase) && (
              <div className="pl-2 border-l-2 border-indigo-200 space-y-2">
                <p className="text-xs text-gray-400 font-medium">Carat</p>
                <div className="flex flex-wrap gap-2">
                  {GOLD_CARATS_MOB.map(ct => (
                    <span key={ct} className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none ${pendingCarat === ct ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                      onClick={() => setPendingCarat(prev => prev === ct ? '' : ct)}
                    >{ct}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none ${pendingCarat ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                    onClick={() => {
                      if (!pendingCarat) return;
                      const entry: MobMaterialEntry = { base: pendingBase, carat: pendingCarat };
                      setSelectedMaterials(prev => [...prev.filter(e => e.base !== pendingBase), entry]);
                      setPendingBase(null); setPendingCarat('');
                    }}
                  >Add</span>
                  <span className="px-4 py-1.5 rounded-full text-sm text-gray-400 cursor-pointer select-none active:bg-gray-100"
                    onClick={() => { setPendingBase(null); setPendingCarat(''); }}
                  >Cancel</span>
                </div>
              </div>
            )}

            {/* Stones */}
            <p className="text-xs text-gray-400 font-medium pt-1">Diamonds &amp; Stones</p>
            <div className="flex flex-wrap gap-2">
              {STONE_TYPES_MOB.map(m => {
                const isSelected = selectedMaterials.some(e => e.base === m);
                const isPending = pendingBase === m;
                const needsCut = m === 'DIAMOND' || m === 'LAB_DIAMOND';
                return (
                  <span key={m} className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none transition-colors ${isSelected || isPending ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                    onClick={() => {
                      if (needsCut) {
                        setPendingBase(isPending ? null : m); setPendingCarat(''); setPendingCut('');
                      } else {
                        setSelectedMaterials(prev => isSelected ? prev.filter(e => e.base !== m) : [...prev, { base: m }]);
                      }
                    }}
                  >{MATERIAL_LABELS_MOB[m]}</span>
                );
              })}
            </div>

            {/* Cut picker for pending diamond */}
            {pendingBase && (pendingBase === 'DIAMOND' || pendingBase === 'LAB_DIAMOND') && (
              <div className="pl-2 border-l-2 border-purple-200 space-y-2">
                <p className="text-xs text-gray-400 font-medium">Cut (optional)</p>
                <div className="flex flex-wrap gap-2">
                  {DIAMOND_CUTS_MOB.map(cut => (
                    <span key={cut} className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none ${pendingCut === cut ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'}`}
                      onClick={() => setPendingCut(prev => prev === cut ? '' : cut)}
                    >{cut}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <span className="px-4 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none bg-purple-600 text-white active:bg-purple-700"
                    onClick={() => {
                      const entry: MobMaterialEntry = { base: pendingBase, ...(pendingCut ? { detail: pendingCut } : {}) };
                      setSelectedMaterials(prev => [...prev.filter(e => e.base !== pendingBase), entry]);
                      setPendingBase(null); setPendingCut('');
                    }}
                  >Add</span>
                  <span className="px-4 py-1.5 rounded-full text-sm text-gray-400 cursor-pointer select-none active:bg-gray-100"
                    onClick={() => { setPendingBase(null); setPendingCut(''); }}
                  >Cancel</span>
                </div>
              </div>
            )}
          </div>
          <div className="px-4 py-3">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Condition</label>
            <div className="flex gap-3 mt-2">
              {CONDITIONS.map(c => (
                <span
                  key={c}
                  onClick={() => {
                    const synthetic = { target: { value: c } } as React.ChangeEvent<HTMLInputElement>;
                    set('condition')(synthetic);
                  }}
                  className={`flex-1 text-center py-2 rounded-xl text-sm font-semibold cursor-pointer select-none transition-colors ${
                    form.condition === c ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  {c === 'BRAND_NEW' ? 'Brand New' : 'Used'}
                </span>
              ))}
            </div>
          </div>
          {isBuyme && (
            <div className="px-4 py-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Watch Brand</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {WATCH_BRANDS.map(b => (
                  <span
                    key={b}
                    onClick={() => {
                      const synthetic = { target: { value: form.brand === b ? '' : b } } as React.ChangeEvent<HTMLInputElement>;
                      set('brand')(synthetic);
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer select-none transition-colors ${
                      form.brand === b ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Tap to select, tap again to deselect</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MobileAddProduct() {
  const { user, auth } = useAuth();
  const isBuyme = auth.tenantInfo?.tenantSlug === 'buymejewellery';
  const navigate = useNavigate();

  // ── View state
  const [view, setView] = useState<View>('add');

  // ── Shared
  const [categories, setCategories] = useState<Category[]>([]);

  // ── Add form state
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [successFlash, setSuccessFlash] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // ── Add material state
  const [addMaterials, setAddMaterials] = useState<MobMaterialEntry[]>([]);
  const [addPendingBase, setAddPendingBase] = useState<string | null>(null);
  const [addPendingCarat, setAddPendingCarat] = useState('');
  const [addPendingCut, setAddPendingCut] = useState('');

  // ── List view state
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Edit form state
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const [editPhotoUploading, setEditPhotoUploading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const editCameraRef = useRef<HTMLInputElement>(null);
  const editGalleryRef = useRef<HTMLInputElement>(null);

  // ── Edit material state
  const [editMaterials, setEditMaterials] = useState<MobMaterialEntry[]>([]);
  const [editPendingBase, setEditPendingBase] = useState<string | null>(null);
  const [editPendingCarat, setEditPendingCarat] = useState('');
  const [editPendingCut, setEditPendingCut] = useState('');

  // ── Load categories on mount
  useEffect(() => {
    productService.getCategories().then(setCategories).catch(() => {});
  }, []);

  // ── Load products when list view opens
  const loadProducts = useCallback(async (query = '') => {
    setLoadingProducts(true);
    try {
      if (query.trim()) {
        const results = await productService.searchProducts(query, 60);
        setProducts(results);
      } else {
        const response = await productService.getProducts(1, 100, {});
        setProducts(response.data);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') loadProducts('');
  }, [view]);

  // Debounced search in list view
  useEffect(() => {
    if (view !== 'list') return;
    const t = setTimeout(() => loadProducts(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery, view]);

  // ─────────────────────────────────────────────────────
  // Add form handlers
  // ─────────────────────────────────────────────────────

  const set = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setForm(f => ({ ...f, [field]: value }));
      if (field === 'name') checkNameDuplicate(value);
      if (field === 'sku') checkSkuDuplicate(value);
    };

  const checkNameDuplicate = useCallback(async (name: string) => {
    if (name.trim().length < 3) { setDuplicateWarning(null); return; }
    try {
      const results = await productService.searchProducts(name.trim(), 5);
      const match = results.find(p => p.name.trim().toLowerCase() === name.trim().toLowerCase());
      if (match) {
        setDuplicateWarning(`A product named "${match.name}" already exists (SKU: ${match.sku}). You may be adding a duplicate.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      setDuplicateWarning(null);
    }
  }, []);

  const checkSkuDuplicate = useCallback(async (sku: string) => {
    if (sku.trim().length < 3) { setDuplicateWarning(null); return; }
    try {
      const results = await productService.searchProducts(sku.trim(), 10);
      const match = results.find(p => p.sku.trim().toLowerCase() === sku.trim().toLowerCase());
      if (match) {
        setDuplicateWarning(`SKU "${sku}" is already used by "${match.name}". Change the SKU or you will create a duplicate.`);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      setDuplicateWarning(null);
    }
  }, []);

  const autoSKU = () => {
    if (!form.name) return;
    setForm(f => ({ ...f, sku: generateSKU(f.name, addMaterials) }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    if (!form.name.trim()) return setAddError('Product name is required.');
    if (!form.sku.trim()) return setAddError('SKU is required. Use the shuffle button to auto-generate.');
    if (!form.price || Number(form.price) < 0) return setAddError('Selling price is required.');
    if (!form.stock || Number(form.stock) < 0) return setAddError('Quantity is required.');

    setSubmitting(true);
    try {
      const payload: CreateProductData = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: Number(form.price),
        cost: Number(form.cost) || 0,
        stock: Number(form.stock),
        minStockLevel: Number(form.minStockLevel) || 1,
        category: form.category || undefined,
        material: primaryMaterialStrMob(addMaterials) || undefined,
        description: form.description.trim() || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
      };
      (payload as any).condition = form.condition;
      (payload as any).materials = addMaterials.length > 0 ? JSON.stringify(addMaterials) : undefined;
      if (form.brand) (payload as any).supplierName = form.brand;

      const created = await productService.createProduct(payload);

      if (photoFile && created?.id) {
        setPhotoUploading(true);
        try {
          await productService.uploadProductImage(created.id, photoFile);
        } catch { /* non-fatal */ } finally {
          setPhotoUploading(false);
        }
      }

      setAddedCount(c => c + 1);
      setSuccessFlash(true);
      setTimeout(() => setSuccessFlash(false), 1800);
      setForm(f => ({ ...emptyForm, condition: f.condition, category: f.category, brand: f.brand }));
      // Keep material selection for next add
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err: any) {
      setAddError(err?.message || 'Failed to add product. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // Edit form handlers
  // ─────────────────────────────────────────────────────

  const setEdit = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(f => ({ ...f, [field]: e.target.value }));

  const autoEditSKU = () => {
    if (!editForm.name) return;
    setEditForm(f => ({ ...f, sku: generateSKU(f.name, editMaterials) }));
  };

  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setEditPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const openEditProduct = (product: Product) => {
    setEditProduct(product);
    const img = product.images?.[0];
    const imgUrl = normalizeImageUrl(img?.filePath ?? img?.driveViewLink) ?? null;
    setExistingImageUrl(imgUrl);
    setEditPhotoFile(null);
    setEditPhotoPreview(null);
    setEditError(null);
    setEditSuccess(false);
    // Parse multi-material from new JSON field or legacy single material
    const rawMaterials = (product as any).materials;
    if (rawMaterials) {
      try { setEditMaterials(JSON.parse(rawMaterials)); }
      catch { setEditMaterials([]); }
    } else if (product.material) {
      setEditMaterials([parseLegacyMaterialMob(product.material)]);
    } else {
      setEditMaterials([]);
    }
    setEditPendingBase(null); setEditPendingCarat(''); setEditPendingCut('');

    setEditForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      price: product.price != null ? String(product.price) : '',
      cost: product.cost != null ? String(product.cost) : '',
      weight: product.weight != null ? String(product.weight) : '',
      stock: product.stock != null ? String(product.stock) : '',
      minStockLevel: product.minStockLevel != null ? String(product.minStockLevel) : '1',
      category: product.category ?? '',
      condition: (product as any).condition ?? 'BRAND_NEW',
      description: product.description ?? '',
      brand: product.supplierName ?? '',
    });
    setView('edit');
  };

  const handleEditSubmit = async () => {
    if (!editProduct) return;
    setEditError(null);
    if (!editForm.name.trim()) return setEditError('Product name is required.');
    if (!editForm.sku.trim()) return setEditError('SKU is required.');
    if (!editForm.price || Number(editForm.price) < 0) return setEditError('Selling price is required.');

    setEditSubmitting(true);
    try {
      await productService.updateProduct(editProduct.id, {
        name: editForm.name.trim(),
        sku: editForm.sku.trim(),
        price: Number(editForm.price),
        cost: Number(editForm.cost) || 0,
        stock: Number(editForm.stock) || 0,
        minStockLevel: Number(editForm.minStockLevel) || 1,
        category: editForm.category || undefined,
        material: primaryMaterialStrMob(editMaterials) || undefined,
        description: editForm.description.trim() || undefined,
        weight: editForm.weight ? Number(editForm.weight) : undefined,
        ...(editForm.condition ? { condition: editForm.condition } as any : {}),
        ...(editMaterials.length > 0 ? { materials: JSON.stringify(editMaterials) } as any : {}),
        ...(editForm.brand ? { supplier: editForm.brand } as any : {}),
      });

      if (editPhotoFile) {
        setEditPhotoUploading(true);
        try {
          await productService.uploadProductImage(editProduct.id, editPhotoFile);
          // Update existingImageUrl to the new preview so it persists after save
          setExistingImageUrl(editPhotoPreview);
          setEditPhotoFile(null);
          setEditPhotoPreview(null);
        } catch { /* non-fatal */ } finally {
          setEditPhotoUploading(false);
        }
      }

      // Patch the product in the list so it reflects new name/price without a reload
      setProducts(prev => prev.map(p =>
        p.id === editProduct.id
          ? { ...p, name: editForm.name.trim(), sku: editForm.sku.trim(), price: Number(editForm.price) }
          : p
      ));

      setEditSuccess(true);
      setTimeout(() => setEditSuccess(false), 2500);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // Header title / back target per view
  // ─────────────────────────────────────────────────────

  const handleBack = () => {
    if (view === 'edit') { setView('list'); return; }
    if (view === 'list') { setView('add'); setSearchQuery(''); return; }
    navigate('/inventory');
  };

  const headerTitle = view === 'add'
    ? 'Add Product'
    : view === 'list'
    ? 'Edit Product'
    : (editProduct?.name ?? 'Edit Product');

  const headerSub = view === 'add'
    ? `${user?.name ?? 'Inventory'} · ${addedCount > 0 ? `${addedCount} added` : 'Mobile quick-add'}`
    : view === 'list'
    ? 'Search & select a product'
    : editProduct?.sku ?? '';

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={handleBack}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight truncate">{headerTitle}</h1>
            <p className="text-xs text-gray-500 truncate">{headerSub}</p>
          </div>

          {/* Right-side actions */}
          {view === 'add' && (
            <button
              onClick={() => setView('list')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold active:bg-indigo-100 flex-shrink-0"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
          )}
          {view === 'add' && addedCount > 0 && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200 flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              {addedCount}
            </div>
          )}
          {view === 'edit' && editSuccess && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-green-200 flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5" />
              Saved
            </div>
          )}
        </div>

        {/* Progress bar */}
        {view === 'add' && (
          <div
            className="h-1 bg-green-500 transition-all duration-500"
            style={{ width: successFlash ? '100%' : '0%', opacity: successFlash ? 1 : 0 }}
          />
        )}
        {view === 'edit' && (
          <div
            className="h-1 bg-indigo-500 transition-all duration-500"
            style={{ width: editSuccess ? '100%' : '0%', opacity: editSuccess ? 1 : 0 }}
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          VIEW: ADD
         ══════════════════════════════════════════════════════════ */}
      {view === 'add' && (
        <form onSubmit={handleSubmit} className="flex-1 px-4 py-5 space-y-5 pb-32">
          {addError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{addError}</div>
          )}
          {duplicateWarning && (
            <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
              <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
              <span>{duplicateWarning}</span>
            </div>
          )}
          <PhotoSection
            preview={photoPreview}
            onCamera={() => cameraInputRef.current?.click()}
            onGallery={() => galleryInputRef.current?.click()}
            onClear={() => { setPhotoFile(null); setPhotoPreview(null); }}
            cameraRef={cameraInputRef}
            galleryRef={galleryInputRef}
            onChange={handlePhotoChange}
          />
          <ProductFormFields
            form={form}
            set={set}
            onAutoSKU={autoSKU}
            categories={categories}
            isBuyme={isBuyme}
            selectedMaterials={addMaterials}
            setSelectedMaterials={setAddMaterials}
            pendingBase={addPendingBase}
            setPendingBase={setAddPendingBase}
            pendingCarat={addPendingCarat}
            setPendingCarat={setAddPendingCarat}
            pendingCut={addPendingCut}
            setPendingCut={setAddPendingCut}
          />
        </form>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: LIST
         ══════════════════════════════════════════════════════════ */}
      {view === 'list' && (
        <div className="flex-1 flex flex-col">
          {/* Search bar */}
          <div className="px-4 py-3 bg-white border-b border-gray-100">
            <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, SKU or price…"
                className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
              {searchQuery ? (
                <button type="button" onClick={() => setSearchQuery('')} className="text-gray-400 active:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Product list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-6">
            {loadingProducts ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <RefreshCw className="w-7 h-7 animate-spin mb-3" />
                <p className="text-sm">Loading products…</p>
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Package className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No products found</p>
                {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 pb-1">{products.length} product{products.length !== 1 ? 's' : ''}</p>
                {products.map(product => {
                  const img = product.images?.[0];
                  const imgUrl = normalizeImageUrl(img?.filePath ?? img?.driveViewLink);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => openEditProduct(product)}
                      className="w-full flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 active:bg-gray-50 transition-colors text-left"
                    >
                      {/* Image thumbnail */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {imgUrl ? (
                          <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageOff className="w-5 h-5 text-gray-300" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{product.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">{product.sku}</p>
                        <p className="text-xs text-indigo-600 font-bold mt-0.5">£{Number(product.price).toFixed(2)}</p>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW: EDIT
         ══════════════════════════════════════════════════════════ */}
      {view === 'edit' && (
        <div className="flex-1 px-4 py-5 space-y-5 pb-32">
          {editError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{editError}</div>
          )}
          {editSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Changes saved successfully!
            </div>
          )}

          <PhotoSection
            preview={editPhotoPreview}
            existingUrl={existingImageUrl}
            onCamera={() => editCameraRef.current?.click()}
            onGallery={() => editGalleryRef.current?.click()}
            onClear={() => { setEditPhotoFile(null); setEditPhotoPreview(null); }}
            cameraRef={editCameraRef}
            galleryRef={editGalleryRef}
            onChange={handleEditPhotoChange}
          />

          <ProductFormFields
            form={editForm}
            set={setEdit}
            onAutoSKU={autoEditSKU}
            categories={categories}
            isBuyme={isBuyme}
            selectedMaterials={editMaterials}
            setSelectedMaterials={setEditMaterials}
            pendingBase={editPendingBase}
            setPendingBase={setEditPendingBase}
            pendingCarat={editPendingCarat}
            setPendingCarat={setEditPendingCarat}
            pendingCut={editPendingCut}
            setPendingCut={setEditPendingCut}
          />
        </div>
      )}

      {/* ── Sticky Bottom Button ── */}
      {view === 'add' && (
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
              <><RefreshCw className="w-5 h-5 animate-spin" />{photoUploading ? 'Uploading photo…' : 'Saving…'}</>
            ) : successFlash ? (
              <><CheckCircle className="w-5 h-5" />Added! Add another?</>
            ) : (
              <><Plus className="w-5 h-5" />Add to Inventory</>
            )}
          </button>
        </div>
      )}

      {view === 'edit' && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={handleEditSubmit}
            disabled={editSubmitting}
            className="w-full h-14 flex items-center justify-center gap-2.5 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98]"
            style={{
              background: editSubmitting ? '#a5b4fc' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              boxShadow: editSubmitting ? 'none' : '0 4px 16px rgba(79,70,229,0.4)',
            }}
          >
            {editSubmitting ? (
              <><RefreshCw className="w-5 h-5 animate-spin" />{editPhotoUploading ? 'Uploading photo…' : 'Saving…'}</>
            ) : (
              <><Save className="w-5 h-5" />Save Changes</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
