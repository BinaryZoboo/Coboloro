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

interface TopExpenseItem {
  name: string;
  value: number;
  color: string;
}

interface TopExpenseCategoriesChartProps {
  data: TopExpenseItem[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2 shadow-xl">
      <p className="text-[11px] text-fg-subtle">{label}</p>
      <p className="text-sm font-bold text-fg tabular-nums mt-0.5">
        {(payload[0].value as number).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </p>
    </div>
  );
}

export function TopExpenseCategoriesChart({ data }: TopExpenseCategoriesChartProps) {
  const topData = data.slice(0, 5);

  if (topData.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-fg-subtle">
        Aucune donnée disponible.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, topData.length * 44)}>
      <BarChart
        layout="vertical"
        data={topData}
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" horizontal={false} />
        <XAxis
          type="number"
          stroke="var(--recharts-axis)"
          tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v))}
        />
        <YAxis
          dataKey="name"
          type="category"
          stroke="var(--recharts-axis)"
          tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgb(var(--surface-hover) / 0.5)" }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]}>
          {topData.map((entry, i) => (
            <Cell key={i} fill={entry.color} fillOpacity={0.88} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
