import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Input, SketchButton, CurrencyToggle, Pill } from "./ui-kit";
import { useApp } from "./AppContext";
import { getCategory, Product } from "./data";

export function EditPriceModal({ open, onClose, product }: { open: boolean; onClose: () => void; product: Product | null }) {
  const { setProductPrice, priceOverrides, currency, setCurrency, rate } = useApp();
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!product) return;
    const baseCUP = priceOverrides[product.id] ?? product.pricePerUnitCUP;
    setPrice(currency === "USD" ? baseCUP / rate : baseCUP);
  }, [product, currency, priceOverrides, rate]);

  if (!product) return null;
  const cat = getCategory(product.category);
  const cup = currency === "USD" ? price * rate : price;

  const save = () => {
    if (cup <= 0) return;
    setProductPrice(product.id, cup);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Precio · ${product.name}`} color={cat.color}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Pill color="bg-white">{product.emoji} {product.name}</Pill>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>
        <p className="text-sm font-hand text-base">
          Este es el precio del presupuesto. Subirlo recalcula el presupuesto del mes. Lo que pagues en una compra puntual no afecta este número.
        </p>
        <div>
          <label>Precio por unidad ({currency})</label>
          <Input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="sketch-border rounded-2xl bg-white p-3 flex items-center justify-between" style={{ boxShadow: "2px 2px 0 0 #1A1A1A" }}>
          <span className="font-hand text-base">Costo mensual</span>
          <span className="font-display text-2xl">
            {currency === "USD" ? `$${((cup * product.monthlyQuantity) / rate).toFixed(2)}` : `${Math.round(cup * product.monthlyQuantity).toLocaleString("es-CU")} CUP`}
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <SketchButton color="white" block onClick={onClose}>Cancelar</SketchButton>
          <SketchButton color="mint" block onClick={save}>Guardar</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
