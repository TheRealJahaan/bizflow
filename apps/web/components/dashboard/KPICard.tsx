import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down";
  color?: "green" | "amber" | "rose" | "sky";
}

const colors = {
  green: "border-l-emerald-500",
  amber: "border-l-amber-500",
  rose: "border-l-rose-500",
  sky: "border-l-sky-500",
};

export default function KPICard({
  label, value, sub, trend, color = "green",
}: Props) {
  return (
    <div className={clsx(
      "bg-white rounded-xl border border-stone-200 border-l-4 p-5",
      colors[color]
    )}>
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold text-stone-800 font-mono tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
          {trend === "up" && <span className="text-emerald-500 font-bold">↑</span>}
          {trend === "down" && <span className="text-rose-500 font-bold">↓</span>}
          {sub}
        </p>
      )}
    </div>
  );
}