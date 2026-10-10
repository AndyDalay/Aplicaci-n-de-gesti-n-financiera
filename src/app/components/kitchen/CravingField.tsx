import { RefObject } from "react";
import { KeyboardEvent } from "react";
import { X } from "lucide-react";

export function CravingField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  inputRef,
  maxLength = 200,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  maxLength?: number;
  onSubmit?: () => void;
}) {
  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        rows={2}
        maxLength={maxLength}
        value={value}
        onChange={(event) => {
          onChange(event.target.value.slice(0, maxLength));
          event.currentTarget.style.height = "auto";
          event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
        }}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="min-h-[52px] max-h-28 w-full resize-none overflow-y-auto rounded-xl border border-ink/20 bg-white py-3 pl-3 pr-12 font-['Nunito:Regular'] text-sm leading-[22px] text-ink outline-none focus:border-ink"
      />
      {value && (
        <button type="button" aria-label="Borrar instrucción" onClick={() => onChange("")} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-ink/60 hover:bg-app-bg">
          <X size={16} />
        </button>
      )}
      <span className="pointer-events-none absolute bottom-2 right-3 font-['Nunito:Regular'] text-[10px] text-ink/45">{value.length}/{maxLength}</span>
    </div>
  );
}