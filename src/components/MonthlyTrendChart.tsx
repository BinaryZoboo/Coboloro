import { motion } from "framer-motion";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{label}</p>
      {payload.map((entry, index) => (
        <p
          key={index}
          style={{ color: entry.color }}
          className="text-sm font-semibold"
        >
          {entry.name}: {entry.value.toFixed(2)} €
        </p>
      ))}
    </div>
  );
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">Tendance mensuelle</h2>
        <p className="text-xs text-gray-500 mt-1">
          Revenus vs Dépenses des 12 derniers mois
        </p>
      </div>

      {data.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Aucune donnée disponible pour le moment.
        </div>
      ) : (
        <div className="mt-6 w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#E5E7EB" }} />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", r: 4 }}
                activeDot={{ r: 6 }}
                name="Revenus"
                isAnimationActive={true}
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke="#DC2626"
                strokeWidth={2}
                dot={{ fill: "#DC2626", r: 4 }}
                activeDot={{ r: 6 }}
                name="Dépenses"
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
