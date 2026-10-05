import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { CategoryIcon, Input, Select, SketchButton, TextArea, CurrencyToggle, Pill } from "./ui-kit";
import { useApp } from "./AppContext";
import { CATEGORIES, FixedExpense, getCategory } from "./data";

export function AddExpenseModal({
  open,
  onClose,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  prefill?: Partial<FixedExpense> & { type?: "gasto-fijo" | "imprevisto" | "ingreso" };
}) {
  const { addMovement, currency, setCurrency, rate, currentUserId } = useApp();
  const [type, setType] = useState<"gasto-fijo" | "imprevisto" | "ingreso">(prefill?.type ?? "imprevisto");
  const [name, setName] = useState(prefill?.name ?? "");
  const [category, setCategory] = useState(prefill?.category ?? "otros");
  const [amount, setAmount] = useState(prefill?.amountCUP ?? 0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(prefill?.type ?? "imprevisto");
    setName(prefill?.name ?? "");
    setCategory(prefill?.category ?? "otros");
    setAmount(prefill?.amountCUP ?? 0);
    setNote("");
  }, [open, prefill]);

  const cat = getCategory(category);
  const amountCUP = currency === "USD" ? amount * rate : amount;

  const submit = () => {
    if (!name.trim() || amountCUP <= 0) return;
    addMovement({ type, name: name.trim(), category, amountCUP, note, by: currentUserId });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={prefill?.name ?? "Nuevo movimiento"} color={cat.color}>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Pill color="bg-white"><CategoryIcon cat={cat} size={16} /> {cat.name}</Pill>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <div>
          <label>Tipo</label>
          <Select value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="imprevisto">💥 Imprevisto</option>
            <option value="gasto-fijo">📅 Gasto fijo</option>
            <option value="ingreso">💰 Ingreso</option>
          </Select>
        </div>
        <div>
          <label>Nombre</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Electricidad" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label>Categoría</label>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
          </div>
          <div>
            <label>Monto ({currency})</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label>Nota</label>
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <SketchButton color="white" block onClick={onClose}>Cancelar</SketchButton>
          <SketchButton color="coral" block onClick={submit}>Guardar</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
