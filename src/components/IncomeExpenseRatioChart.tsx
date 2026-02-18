import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface IncomeExpenseRatioChartProps {
  income: number;
  expense: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      {payload.map((entry, index) => (
        <div key={index} className="text-sm">
          <p style={{ color: entry.color }} className="font-medium">
            {entry.name}: {entry.value.toFixed(2)} €
          </p>
        </div>
      ))}
    </div>
  );
}

export function IncomeExpenseRatioChart({
  income,
  expense,
}: IncomeExpenseRatioChartProps) {
  const data = [
    {
      name: "Bilan",
      Revenus: income,
      Dépenses: expense,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">
          Équilibre Revenus vs Dépenses
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Vue globale de tous tes revenus et dépenses
        </p>
      </div>

      {income === 0 && expense === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Aucune donnée disponible.
        </div>
      ) : (
        <>
          <div className="mt-6 w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "#E5E7EB" }}
                  iconType="square"
                />
                <Bar
                  dataKey="Revenus"
                  fill="#10B981"
                  name="Revenus"
                  radius={[8, 8, 0, 0]}
                />
                <Bar
                  dataKey="Dépenses"
                  fill="#EF4444"
                  name="Dépenses"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </motion.div>
  );
}
