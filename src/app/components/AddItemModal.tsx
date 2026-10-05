import { useState } from "react";
import { Modal } from "./Modal";
import { Input, Select, SketchButton } from "./ui-kit";
import { useApp } from "./AppContext";
import { PRODUCTS } from "./data";

export function AddItemModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addShopping, people, currentUserId } = useApp();
  const [productId, setProductId] = useState<string>("");
  const [customName, setCustomName] = useState("");
  const [qty, setQty] = useState(1);
  const [priority, setPriority] = useState<"alta" | "normal">("normal");
  const [assignedTo, setAssignedTo] = useState("");

  const reset = () => { setProductId(""); setCustomName(""); setQty(1); setPriority("normal"); setAssignedTo(""); };

  const submit = () => {
    if (!productId && !customName.trim()) return;
    addShopping({
      productId: productId || undefined,
      customName: productId ? undefined : customName.trim(),
      qtySuggested: qty,
      priority,
      assignedTo: assignedTo || undefined,
      createdBy: currentUserId,
    });
    reset(); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Añadir a la lista" color="bg-pastel-pink">
      <div className="space-y-3">
        <div>
          <label>Producto del inventario</label>
          <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">— Personalizado —</option>
            {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </Select>
        </div>
        {!productId && (
          <div>
            <label>Nombre personalizado</label>
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej: Servilletas" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Cantidad</label>
            <Input type="number" step="0.5" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label>Prioridad</label>
            <Select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
              <option value="normal">Normal</option>
              <option value="alta">Alta 🚨</option>
            </Select>
          </div>
        </div>
        <div>
          <label>Asignar a</label>
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Cualquiera</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
          </Select>
        </div>
        <div className="flex gap-2 pt-1">
          <SketchButton color="white" block onClick={onClose}>Cancelar</SketchButton>
          <SketchButton color="lavender" block onClick={submit}>Añadir</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
