import * as React from "react";

type AccordionItem = {
  title: React.ReactNode;
  content: React.ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  defaultOpenIndex?: number;
  allowMultiple?: boolean;
  className?: string;
};

export const Accordion: React.FC<AccordionProps> = ({
  items,
  defaultOpenIndex,
  allowMultiple = false,
  className,
}) => {
  const [openIndexes, setOpenIndexes] = React.useState<number[]>(
    typeof defaultOpenIndex === "number" ? [defaultOpenIndex] : []
  );

  const toggleIndex = (idx: number) => {
    setOpenIndexes((prev) => {
      if (allowMultiple) {
        return prev.includes(idx)
          ? prev.filter((i) => i !== idx)
          : [...prev, idx];
      } else {
        return prev.includes(idx) ? [] : [idx];
      }
    });
  };

  return (
    <div className={className}>
      {items.map((item, idx) => {
        const open = openIndexes.includes(idx);
        return (
          <div key={idx} className="border-b border-hairline">
            <button
              className={`flex w-full items-center justify-between p-4 text-left font-bold text-ink transition hover:bg-navy-tint focus:outline-none ${
                open ? "bg-navy-tint" : "bg-paper"
              }`}
              aria-expanded={open}
              aria-controls={`accordion-panel-${idx}`}
              onClick={() => toggleIndex(idx)}
              type="button"
            >
              <span>{item.title}</span>
              <span className="ml-2 text-muted">
                {open ? "−" : "+"}
              </span>
            </button>
            <div
              id={`accordion-panel-${idx}`}
              role="region"
              hidden={!open}
              className={`overflow-hidden transition-all ${
                open ? "max-h-96 p-4 pt-0" : "max-h-0 p-0"
              }`}
            >
              {open && <div>{item.content}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};