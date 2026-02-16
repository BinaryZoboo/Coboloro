import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface ChartItem {
  name: string;
  value: number;
  color: string;
}

interface SpendingChartProps {
  data: ChartItem[];
}
interface CustomTooltipProps {
  active?: boolean;
  payload?: {
    payload: {
      name: string;
      value: number;
      color: string;
    };
  }[];
}
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload?.length) {
    const item = payload[0].payload;
    const total = payload.reduce((sum, entry) => {
      const current = entry.payload?.value ?? 0;
      return sum + current;
    }, 0);

    if (total <= 0) return null;
    return (
      <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
        <p className="text-sm font-medium text-white">{item.name}</p>
        <p className="text-sm text-gold font-semibold">
          {item.value.toFixed(2)} €
        </p>
        <p className="text-xs text-gray-400">
          {((item.value / total) * 100).toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
}
export function SpendingChart({ data }: SpendingChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
        delay: 0.35,
      }}
      className="bg-dark-card border border-dark-border rounded-xl p-5"
    >
      <h3 className="text-sm font-semibold text-white mb-1">
        Dépenses par catégorie
      </h3>
      <p className="text-xs text-gray-500 mb-5">Répartition du mois en cours</p>

      {data.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Aucune depense enregistree pour le moment.
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Chart */}
          <div className="w-48 h-48 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index.toString()}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-3">
            {data.map((item) => {
              const pct =
                total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: item.color,
                      }}
                    />

                    <span className="text-sm text-gray-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">
                      {item.value.toFixed(0)} €
                    </span>
                    <span className="text-xs text-gray-500 w-10 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
