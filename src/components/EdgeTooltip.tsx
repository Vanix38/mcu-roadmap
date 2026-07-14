type Props = {
  label: string;
  x: number;
  y: number;
};

export function EdgeTooltip({ label, x, y }: Props) {
  return (
    <div
      className="edge-tooltip"
      style={{ left: x, top: y - 8 }}
      role="tooltip"
    >
      {label}
    </div>
  );
}
