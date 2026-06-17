import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface PieItem {
  name: string;
  value: number;
  color: string;
}

interface MobileSpendingPieProps {
  data: PieItem[];
  total: number;
}

export function MobileSpendingPie({ data, total }: MobileSpendingPieProps) {
  const topData = data.slice(0, 6);

  if (topData.length === 0) {
    return (
      <div className="rounded-2xl border border-surface-border bg-surface-card p-5">
        <p className="text-sm font-semibold text-fg mb-1">Dépenses</p>
        <p className="text-xs text-fg-subtle text-center py-6">Aucune dépense ce mois</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5">
      <p className="text-sm font-semibold text-fg mb-4">Dépenses par catégorie</p>
      <div className="flex items-center gap-4">
        <div className="w-36 h-36 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={topData}
                dataKey="value"
                cx="50%"
                cy="50%"
                outerRadius={62}
                innerRadius={38}
                strokeWidth={0}
              >
                {topData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(2)} €`, ""]}
                contentStyle={{
                  background: "rgb(var(--surface-elevated))",
                  border: "1px solid rgb(var(--surface-border))",
                  borderRadius: "10px",
                  fontSize: "12px",
                  color: "rgb(var(--fg))",
                }}
                itemStyle={{ color: "rgb(var(--fg-secondary))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          {topData.map((item) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-fg-secondary truncate flex-1">{item.name}</span>
                <span className="text-xs font-semibold text-fg tabular-nums flex-shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
