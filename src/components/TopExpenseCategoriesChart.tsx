import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export function TopExpenseCategoriesChart({
  data,
}: TopExpenseCategoriesChartProps) {
  const topData = data.slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="bg-dark-card border border-dark-border rounded-xl p-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-white">
          Top dépenses par catégorie
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Les 6 catégories les plus dépensées
        </p>
      </div>

      {topData.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Aucune donnée disponible.
        </div>
      ) : (
        <div className="mt-6 w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#9CA3AF"
                style={{ fontSize: "11px" }}
                width={95}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="value"
                fill="#D4A853"
                radius={[0, 8, 8, 0]}
                name="Montant"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}
