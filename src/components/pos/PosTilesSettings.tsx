import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { posTileService, PosTile } from '@/services/posTileService';
import {
  TILE_ICON_KEYS,
  TILE_COLOR_KEYS,
  getTileIcon,
  getTileColor,
} from '@/lib/posTileVisuals';

const emptyForm = { label: '', saleName: '', price: '', color: 'blue', icon: 'Tag' };

const PosTilesSettings: React.FC = () => {
  const [tiles, setTiles] = useState<PosTile[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTiles(await posTileService.list());
    } catch {
      toast.error('Failed to load POS tiles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (tile: PosTile) => {
    setEditingId(tile.id);
    setForm({
      label: tile.label,
      saleName: tile.saleName === tile.label ? '' : tile.saleName,
      price: tile.defaultPrice != null ? String(tile.defaultPrice) : '',
      color: tile.color,
      icon: tile.icon,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error('Please enter a tile name');
      return;
    }
    const priceNum = form.price.trim() === '' ? null : Number(form.price);
    if (priceNum != null && (Number.isNaN(priceNum) || priceNum < 0)) {
      toast.error('Enter a valid price, or leave blank to prompt at sale');
      return;
    }
    const payload = {
      label: form.label.trim(),
      saleName: form.saleName.trim() || form.label.trim(),
      defaultPrice: priceNum,
      color: form.color,
      icon: form.icon,
    };
    try {
      setLoading(true);
      if (editingId) {
        await posTileService.update(editingId, payload);
        toast.success('Tile updated');
      } else {
        await posTileService.create(payload);
        toast.success('Tile created');
      }
      setDialogOpenAndReset();
      await load();
    } catch {
      toast.error('Failed to save tile');
    } finally {
      setLoading(false);
    }
  };

  const setDialogOpenAndReset = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (tile: PosTile) => {
    if (!confirm(`Delete the tile "${tile.label}"?`)) return;
    try {
      await posTileService.remove(tile.id);
      toast.success('Tile removed');
      await load();
    } catch {
      toast.error('Failed to remove tile');
    }
  };

  const PreviewIcon = getTileIcon(form.icon);
  const previewColor = getTileColor(form.color);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>POS Quick Tiles</CardTitle>
            <CardDescription>
              Create your own POS shortcut tiles (e.g. "Cleaning Kit £12"). They
              appear in the till's tiles area and can be re-ordered there by drag
              and drop.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tile
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {loading && tiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Loading…</div>
          ) : tiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tiles yet. Click "Add Tile" to create one.
            </div>
          ) : (
            tiles.map((tile) => {
              const Icon = getTileIcon(tile.icon);
              const c = getTileColor(tile.color);
              return (
                <div
                  key={tile.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${c.tile}`}>
                      <Icon className={`h-5 w-5 ${c.icon}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{tile.label}</p>
                      <p className="text-xs text-gray-500">
                        {tile.saleName !== tile.label && `${tile.saleName} · `}
                        {tile.defaultPrice != null && tile.defaultPrice > 0
                          ? `£${tile.defaultPrice.toFixed(2)}`
                          : 'Price prompted at sale'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(tile)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tile)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : setDialogOpenAndReset())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Tile' : 'Add New Tile'}</DialogTitle>
            <DialogDescription>
              The tile behaves like the built-in service tiles: tapping it adds a
              line to the cart at the default price (cashiers can still adjust it).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="tile-label">Tile name</Label>
              <Input
                id="tile-label"
                placeholder="e.g. Cleaning Kit"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                maxLength={40}
              />
            </div>
            <div>
              <Label htmlFor="tile-saleName">Sale line name (optional)</Label>
              <Input
                id="tile-saleName"
                placeholder="Defaults to the tile name"
                value={form.saleName}
                onChange={(e) => setForm((f) => ({ ...f, saleName: e.target.value }))}
                maxLength={80}
              />
            </div>
            <div>
              <Label htmlFor="tile-price">Default price (£)</Label>
              <Input
                id="tile-price"
                type="number"
                inputMode="decimal"
                placeholder="Leave blank to prompt at sale"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>
            <div>
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TILE_ICON_KEYS.map((key) => {
                  const Icon = getTileIcon(key);
                  const active = form.icon === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, icon: key }))}
                      className={`rounded-lg p-2 border transition-all ${
                        active
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      aria-label={key}
                    >
                      <Icon className="h-5 w-5 text-gray-700" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TILE_COLOR_KEYS.map((key) => {
                  const c = getTileColor(key);
                  const active = form.color === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: key }))}
                      className={`h-7 w-7 rounded-full ${c.swatch} ${
                        active ? 'ring-2 ring-offset-2 ring-gray-700' : ''
                      }`}
                      aria-label={key}
                    />
                  );
                })}
              </div>
            </div>
            <div>
              <Label>Preview</Label>
              <div
                className={`mt-1 w-40 rounded-xl p-4 ${previewColor.tile}`}
              >
                <PreviewIcon className={`h-6 w-6 mb-2 ${previewColor.icon}`} />
                <p className={`font-semibold text-sm ${previewColor.title}`}>
                  {form.label || 'Tile name'}
                </p>
                <p className={`text-xs ${previewColor.subtitle}`}>
                  {form.price.trim() !== '' && Number(form.price) > 0
                    ? `£${Number(form.price).toFixed(2)}`
                    : 'Quick add'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={setDialogOpenAndReset}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {editingId ? 'Update Tile' : 'Add Tile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PosTilesSettings;
