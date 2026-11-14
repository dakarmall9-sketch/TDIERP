import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  History,
  Edit3,
  X,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StockItem } from '../../types';
import {
  useRealtimeAutoSave,
  loadDraftFromStorage,
  saveDraftToStorage,
  clearDraftFromStorage,
} from '../../hooks/useAutoSave';

const NEW_STOCK_DRAFT_KEY = 'transmove_draft_stock_new';

export const StockInventoryModule: React.FC = () => {
  const { stockItems, stockMovements, adjustStock, addStockItem, updateStockItem, currentCompany } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Adjustment modal
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(50);
  const [adjustType, setAdjustType] = useState<'entree' | 'sortie'>('entree');
  const [adjustReason, setAdjustReason] = useState('Réception commande fournisseur');

  // Create / Edit Item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const defaultNewItemForm = useMemo<Omit<StockItem, 'id'>>(
    () => ({
      code: '',
      name: '',
      category: 'cartons',
      quantityInStock: 0,
      quantityReserved: 0,
      quantityUsedTotal: 0,
      minThreshold: 20,
      unitCost: 1.5,
      unitPrice: 3,
      location: 'Entrepôt Central - Allée A',
      unit: 'unité',
    }),
    []
  );
  const [itemForm, setItemForm] = useState<Omit<StockItem, 'id'>>(() =>
    loadDraftFromStorage(NEW_STOCK_DRAFT_KEY, defaultNewItemForm)
  );

  // Persist new-item draft in real time when creating a new item
  useEffect(() => {
    if (!editingItem && (itemForm.name.trim() || itemForm.code.trim())) {
      saveDraftToStorage(NEW_STOCK_DRAFT_KEY, itemForm);
    }
  }, [editingItem, itemForm]);

  const { cancelPending: cancelStockAutoSave } = useRealtimeAutoSave({
    enabled: Boolean(isItemModalOpen && editingItem),
    data: itemForm,
    resetKey: editingItem?.id || 'none',
    delayMs: 600,
    onSave: (form) => {
      if (!editingItem || !form.name.trim() || !form.code.trim()) return;
      updateStockItem(
        {
          ...editingItem,
          ...form,
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
        },
        { silent: true }
      );
    },
  });

  const totalStockValue = stockItems.reduce((acc, i) => acc + i.quantityInStock * i.unitCost, 0);
  const lowStockCount = stockItems.filter((i) => i.quantityInStock <= i.minThreshold).length;

  const filteredItems = stockItems.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    adjustStock(selectedItem.id, adjustQty, adjustReason, adjustType);
    setSelectedItem(null);
  };

  const openCreateItemModal = () => {
    cancelStockAutoSave();
    setEditingItem(null);
    const savedDraft = loadDraftFromStorage<Omit<StockItem, 'id'> | null>(NEW_STOCK_DRAFT_KEY, null);
    setItemForm(
      savedDraft || {
        code: `ART-${String(stockItems.length + 10).padStart(3, '0')}`,
        name: '',
        category: 'cartons',
        quantityInStock: 100,
        quantityReserved: 0,
        quantityUsedTotal: 0,
        minThreshold: 20,
        unitCost: 2,
        unitPrice: 4,
        location: 'Entrepôt Central',
        unit: 'unité',
      }
    );
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: StockItem) => {
    cancelStockAutoSave();
    setEditingItem(item);
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      quantityInStock: item.quantityInStock,
      quantityReserved: item.quantityReserved,
      quantityUsedTotal: item.quantityUsedTotal,
      minThreshold: item.minThreshold,
      unitCost: item.unitCost,
      unitPrice: item.unitPrice,
      location: item.location,
      unit: item.unit,
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !itemForm.code.trim()) return;
    cancelStockAutoSave();

    if (editingItem) {
      updateStockItem({
        ...editingItem,
        ...itemForm,
        code: itemForm.code.trim().toUpperCase(),
        name: itemForm.name.trim(),
      });
    } else {
      addStockItem({
        ...itemForm,
        code: itemForm.code.trim().toUpperCase(),
        name: itemForm.name.trim(),
      });
      clearDraftFromStorage(NEW_STOCK_DRAFT_KEY);
    }
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              MODULE 9
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestion de Stock, Consommables & Matériel
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Suivi des cartons, adhésifs, sangles et couvertures, réservations par chantier et alertes de seuil critique
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={openCreateItemModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-slate-700 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle Référence</span>
          </button>

          <button
            onClick={() => {
              if (!stockItems[0]) return;
              setSelectedItem(stockItems[0]);
              setAdjustType('entree');
              setAdjustReason('Réassort commande fournisseur');
            }}
            disabled={stockItems.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Entrée de Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Valorisation du Stock</div>
          <div className="text-xl font-black text-amber-400 mt-1">
            {totalStockValue.toLocaleString()} <span className="text-xs text-slate-400">{currentCompany.currency}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Au coût de revient</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Articles en Stock</div>
          <div className="text-xl font-black text-white mt-1">{stockItems.length} références</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cartons, bulles, sangles</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Alertes Stock Critique</div>
          <div className={`text-xl font-black mt-1 ${lowStockCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {lowStockCount} référence(s)
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Sous le seuil minimum</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Unités Réservées Chantiers</div>
          <div className="text-xl font-black text-cyan-400 mt-1">
            {stockItems.reduce((acc, i) => acc + i.quantityReserved, 0)} unités
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Bloquées pour départs</div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher consommable, carton, diable..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
        >
          <option value="all">Toutes les catégories</option>
          <option value="cartons">Cartons de déménagement</option>
          <option value="adhesifs">Rubans adhésifs</option>
          <option value="protections">Films bulle & Couvertures</option>
          <option value="manutention">Sangles & Diables</option>
          <option value="consommables">Consommables divers</option>
        </select>
      </div>

      {/* Stock Items Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Article / Code</th>
                <th className="py-2.5 px-3">Emplacement</th>
                <th className="py-2.5 px-3 text-center">En Stock</th>
                <th className="py-2.5 px-3 text-center">Réservé Chantiers</th>
                <th className="py-2.5 px-3 text-center">Disponible Net</th>
                <th className="py-2.5 px-3 text-center">Seuil Min.</th>
                <th className="py-2.5 px-3 text-right">Coût Unit.</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredItems.map((item) => {
                const available = Math.max(0, item.quantityInStock - item.quantityReserved);
                const isCritical = item.quantityInStock <= item.minThreshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{item.name}</div>
                      <div className="font-mono text-[10px] text-amber-400">{item.code}</div>
                    </td>

                    <td className="py-3 px-3 text-slate-400">{item.location}</td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-white">
                      {item.quantityInStock}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-cyan-400 font-semibold">
                      {item.quantityReserved}
                    </td>

                    <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                      {available}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.minThreshold} {item.unit}s
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-slate-300">
                      {item.unitCost.toFixed(2)} {currentCompany.currency}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditItemModal(item)}
                          title="Modifier seuils / prix / emplacement"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setAdjustType('entree');
                            setAdjustReason('Réassort');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-bold"
                        >
                          + Entrée
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItem(item);
                            setAdjustType('sortie');
                            setAdjustReason('Dotation chantier direct');
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-400 text-[11px] font-bold"
                        >
                          - Sortie
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movements Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-white text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-amber-400" />
          Journal d’Activité des Mouvements de Stock
        </h3>

        <div className="space-y-2">
          {stockMovements.map((m) => (
            <div key={m.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                    m.type === 'entree'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : m.type === 'sortie'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {m.type === 'entree' ? '↓' : m.type === 'sortie' ? '↑' : 'R'}
                </span>
                <div>
                  <div className="font-semibold text-white">
                    {m.stockItemName}{' '}
                    <span className="font-bold text-amber-400 font-mono">
                      ({m.type === 'entree' ? '+' : '-'}{m.quantity})
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {m.reason} {m.chantierCode ? `• Rattaché à ${m.chantierCode}` : ''}
                  </div>
                </div>
              </div>

              <div className="text-right text-[10px] text-slate-500">
                <div>{m.date}</div>
                <div>{m.performedBy}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Adjust Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Ajustement Stock : {selectedItem.name}
            </h3>

            <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('entree')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    adjustType === 'entree'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Entrée (+ Stock)
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('sortie')}
                  className={`flex-1 py-2 rounded-lg font-bold border transition ${
                    adjustType === 'sortie'
                      ? 'bg-rose-500 text-slate-950 border-rose-400'
                      : 'bg-slate-950 text-slate-400 border-slate-800'
                  }`}
                >
                  Sortie (- Stock)
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Quantité ({selectedItem.unit}s)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Motif du mouvement</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                >
                  Valider le mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Stock Item Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingItem ? `Modifier ${editingItem.name}` : 'Nouvel Article en Stock'}
              </h3>
              <button onClick={() => setIsItemModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Code SKU *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Désignation *</label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Catégorie</label>
                  <select
                    value={itemForm.category}
                    onChange={(e) => setItemForm({ ...itemForm, category: e.target.value as StockItem['category'] })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="cartons">Cartons</option>
                    <option value="adhesifs">Adhésifs</option>
                    <option value="protections">Protections</option>
                    <option value="manutention">Manutention</option>
                    <option value="consommables">Consommables</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Emplacement dépôt</label>
                  <input
                    type="text"
                    value={itemForm.location}
                    onChange={(e) => setItemForm({ ...itemForm, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Quantité</label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.quantityInStock}
                    onChange={(e) => setItemForm({ ...itemForm, quantityInStock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Seuil Alerte</label>
                  <input
                    type="number"
                    min={0}
                    value={itemForm.minThreshold}
                    onChange={(e) => setItemForm({ ...itemForm, minThreshold: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Coût Achat</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Prix Vente</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={itemForm.unitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, unitPrice: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
