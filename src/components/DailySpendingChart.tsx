import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DailySpendingData {
  day: string;
  spent: number;
}

interface DailySpendingChartProps {
  data: DailySpendingData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || payload[0].value === 0) return null;
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-fg-subtle">Jour {label}</p>
      <p className="text-sm font-bold text-fg tabular-nums mt-0.5">
        {payload[0].value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </p>
    </div>
  );
}

function fmt(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

const TODAY_DAY = new Date().getDate().toString();

export function DailySpendingChart({ data }: DailySpendingChartProps) {
  if (data.length === 0 || data.every((d) => d.spent === 0)) {
    return (
      <div className="py-10 text-center text-sm text-fg-subtle">
        Aucune dépense enregistrée pour ce mois.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" vertical={false} />
        <XAxis
          dataKey="day"
          stroke="var(--recharts-axis)"
          tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          stroke="var(--recharts-axis)"
          tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={fmt}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgb(var(--surface-hover) / 0.5)" }} />
        <Bar dataKey="spent" radius={[3, 3, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.day}
              fill={`rgb(var(--accent))`}
              fillOpacity={entry.day === TODAY_DAY ? 1 : entry.spent > 0 ? 0.75 : 0.15}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
