import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { CategoryIcon, Input, Select, SketchButton, TextArea, CurrencyToggle, Pill } from "./ui-kit";
import { useApp } from "./AppContext";
import { CATEGORIES, getCategory, Movement } from "./data";

export function EditMovementModal({ open, onClose, movement }: { open: boolean; onClose: () => void; movement: Movement | null }) {
  const { updateMovement, currency, setCurrency, rate } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("otros");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!movement) return;
    setName(movement.name);
    setCategory(movement.category ?? "otros");
    setAmount(currency === "USD" ? movement.amountCUP / rate : movement.amountCUP);
    setNote(movement.note ?? "");
    setQty(movement.qty ?? 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movement, currency]);

  if (!movement) return null;
  const cat = getCategory(category);
  const amountCUP = currency === "USD" ? amount * rate : amount;

  const save = () => {
    if (!name.trim() || amountCUP <= 0) return;
    updateMovement(movement.id, { name: name.trim(), category, amountCUP, note, qty });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Editar ${movement.name}`} color={cat.color}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Pill color="bg-white"><CategoryIcon cat={cat} size={16} /> {cat.name}</Pill>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <div>
          <label>Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Categoría</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
          </div>
          <div>
            <label>Cantidad</label>
            <Input type="number" step="0.5" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label>Monto total ({currency})</label>
          <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
        </div>
        <div>
          <label>Nota</label>
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <SketchButton color="white" block onClick={onClose}>Cancelar</SketchButton>
          <SketchButton color="mint" block onClick={save}>Guardar</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
