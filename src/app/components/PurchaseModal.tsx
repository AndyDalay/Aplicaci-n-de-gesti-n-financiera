import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { CategoryIcon, Input, Select, SketchButton, TextArea, CurrencyToggle, Pill } from "./ui-kit";
import { useApp } from "./AppContext";
import { getCategory, getProductPrice, PRODUCTS, ShoppingItem } from "./data";

export function PurchaseModal({ open, onClose, item }: { open: boolean; onClose: () => void; item: ShoppingItem | null }) {
  const { currency, setCurrency, rate, addMovement, recordPurchase, stock, removeShopping, currentUserId, priceOverrides } = useApp();
  const product = item?.productId ? PRODUCTS.find((p) => p.id === item.productId) : undefined;
  const [qty, setQty] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!item) return;
    setQty(item.qtySuggested);
    const baseCUP = product ? getProductPrice(product.id, priceOverrides) : 0;
    setUnitPrice(currency === "USD" ? baseCUP / rate : baseCUP);
    setNote(item.note ?? "");
  }, [item, product]);

  if (!item) return null;
  const name = product?.name ?? item.customName ?? "Compra";
  const category = product ? getCategory(product.category) : getCategory();
  const unitCUP = currency === "USD" ? unitPrice * rate : unitPrice;
  const totalCUP = unitCUP * qty;

  const handleConfirm = () => {
    addMovement({
      type: "gasto-variable",
      productId: item.productId,
      name,
      category: product?.category,
      amountCUP: totalCUP,
      qty,
      note,
      by: currentUserId,
    });
    if (item.productId) {
      const cur = stock[item.productId];
      if (cur) recordPurchase(item.productId, qty);
    }
    removeShopping(item.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={`Comprar ${name}`} color={category.color}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Pill color="bg-white"><CategoryIcon cat={category} size={16} /> {category.name}</Pill>
          <CurrencyToggle value={currency} onChange={setCurrency} />
        </div>

        <div>
          <label>Cantidad comprada</label>
          <div className="flex items-center gap-2 mt-1">
            <SketchButton color="white" size="sm" onClick={() => setQty(Math.max(0.5, qty - 0.5))}>−</SketchButton>
            <Input type="number" step="0.5" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} className="text-center" />
            <SketchButton color="white" size="sm" onClick={() => setQty(qty + 0.5)}>+</SketchButton>
          </div>
        </div>

        <div>
          <label>Precio por unidad ({currency})</label>
          <Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)} />
        </div>

        <div>
          <label>Nota</label>
          <TextArea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tienda, marca, observaciones…" />
        </div>

        <div className="sketch-border rounded-2xl bg-white p-3 flex items-center justify-between" style={{ boxShadow: "2px 2px 0 0 #1A1A1A" }}>
          <span className="font-hand text-lg">Total</span>
          <span className="font-display text-2xl">
            {currency === "USD" ? `$${(totalCUP / rate).toFixed(2)}` : `${Math.round(totalCUP).toLocaleString("es-CU")} CUP`}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <SketchButton color="white" block onClick={onClose}>Cancelar</SketchButton>
          <SketchButton color="mint" block onClick={handleConfirm}>✓ Confirmar compra</SketchButton>
        </div>
      </div>
    </Modal>
  );
}
