import { motion } from "motion/react";

const imgMoneyBag = "/assets/ba7d9.svg";

type Props = { month: string; total: string; spent: string; remaining: string; progress: number };

/** Monthly budget summary — violet tinted card from the "Compras" screen. */
export function BudgetCard({ month, total, spent, remaining, progress }: Props) {
  return (
    <section
      className="flex gap-3 items-center px-3 py-2 rounded-[16px] w-full"
      style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.8), rgba(255,255,255,0.8)), linear-gradient(#6236FF, #6236FF)" }}
    >
      <div className="flex flex-col items-center shrink-0">
        <img src={imgMoneyBag} alt="" className="size-12 -mb-1" />
        <p className="font-['Sour_Gummy:Regular'] wdth text-sm text-violet capitalize">{month}</p>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
        <div className="flex items-center justify-between gap-2 font-['Nunito:ExtraBold'] font-extrabold whitespace-nowrap">
          <p className="text-base leading-6 text-violet-ink">Presupuesto:</p>
          <p className="text-lg text-[#4928bf] truncate">{total}</p>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="h-2.5 w-full bg-white rounded-full overflow-clip">
            <motion.div
              className="h-full bg-violet rounded-[12px]"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
          <div className="flex justify-between gap-2 text-xs leading-4 text-[#4e2bcc] opacity-85 whitespace-nowrap wdth">
            <p><span className="font-['Sour_Gummy:Bold'] font-bold">GASTO: </span><span className="font-['Sour_Gummy:Regular']">{spent}</span></p>
            <p><span className="font-['Sour_Gummy:Bold'] font-bold">RESTO: </span><span className="font-['Sour_Gummy:Regular']">{remaining}</span></p>
          </div>
        </div>
      </div>
    </section>
  );
}
