'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface Props {
  /** აქტიური ელემენტის გასაღები — უნდა ემთხვეოდეს შვილებში `data-toolbar-key`-ს */
  activeKey: string | null;
  /** ხაზის ფერი */
  color?: string;
  /** ხაზის სისქე px-ში */
  thickness?: number;
  /** ჰორიზონტალური inset ღილაკის კიდეებიდან */
  inset?: number;
  /** ხაზის ვერტიკალური offset ქვემოდან */
  bottom?: number;
  /** easing-ის ხანგრძლივობა ms-ში */
  duration?: number;
  className?: string;
  children: ReactNode;
}

export function ToolbarIndicator({
  activeKey,
  color = '#4f46e5',
  thickness = 1.5,
  inset = 6,
  bottom = 3,
  duration = 420,
  className = '',
  children,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState({ left: 0, width: 0, visible: false });

  const measure = () => {
    const container = containerRef.current;
    if (!container || !activeKey) {
      setLine((l) => (l.visible ? { ...l, visible: false } : l));
      return;
    }
    const el = container.querySelector<HTMLElement>(
      `[data-toolbar-key="${activeKey}"]`
    );
    if (!el) {
      setLine((l) => (l.visible ? { ...l, visible: false } : l));
      return;
    }
    const parentRect = container.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    setLine({
      left: rect.left - parentRect.left,
      width: rect.width,
      visible: true,
    });
  };

  // ზომების გადათვლა activeKey-ის ცვლილებაზე
  useLayoutEffect(() => {
    measure();
    const raf = requestAnimationFrame(measure);
    const timer = setTimeout(measure, 200); // მენიუს ანიმაციის შემდეგ
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // რეზოლუციის / layout-ის ცვლილებაზე გადათვლა
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);

    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute z-[1] rounded-full"
        style={{
          left: line.left + inset,
          width: Math.max(line.width - inset * 2, 0),
          bottom,
          height: thickness,
          background: color,
          opacity: line.visible ? 1 : 0,
          boxShadow: `0 0 6px ${color}80`,
          transition: `left ${duration}ms cubic-bezier(0.22,1,0.36,1), width ${duration}ms cubic-bezier(0.22,1,0.36,1), opacity 200ms ease`,
        }}
      />
    </div>
  );
}