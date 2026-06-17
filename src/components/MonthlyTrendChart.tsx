import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlyTrendData {
  month: string;
  income: number;
  expense: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrendData[];
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5 shadow-xl space-y-1.5">
      <p className="text-[11px] font-medium text-fg-subtle uppercase tracking-wide">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
          <span className="text-xs text-fg-secondary">{entry.name}</span>
          <span className="text-xs font-semibold text-fg tabular-nums ml-auto pl-4">
            {(entry.value).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €
          </span>
        </div>
      ))}
    </div>
  );
}

function fmt(v: number) {
  return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-fg-subtle">
        Aucune donnée disponible pour le moment.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-5 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-fg-secondary">Revenus</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-fg-secondary">Dépenses</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10B981" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0}    />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="var(--recharts-grid)" vertical={false} />

          <XAxis
            dataKey="month"
            stroke="var(--recharts-axis)"
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            stroke="var(--recharts-axis)"
            tick={{ fontSize: 11, fill: "var(--recharts-axis)" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={fmt}
            width={36}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--recharts-grid)", strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="income"
            name="Revenus"
            stroke="#10B981"
            strokeWidth={2}
            fill="url(#gIncome)"
            dot={false}
            activeDot={{ r: 4, fill: "#10B981", strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="expense"
            name="Dépenses"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#gExpense)"
            dot={false}
            activeDot={{ r: 4, fill: "#EF4444", strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
