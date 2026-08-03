import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

export interface ChartUser {
  plan: string;
  createdAt: Date | string;
}

export interface ChartPlan {
  code: string;
  name: string | null;
  priceMonthly: string | null;
}

const SLICE_COLORS = ["#D4AF37", "#3B82F6", "#10B981", "#A855F7", "#F97316", "#EF4444", "#14B8A6"];

/**
 * Gráficos da visão geral do painel: distribuição de planos e evolução de
 * cadastros nos últimos 6 meses. Antes só existiam números soltos em cards.
 */
export default function AdminOverviewCharts({
  users,
  plans,
  planCounts,
  growthData: growthDataProp,
}: {
  users?: ChartUser[];
  plans: ChartPlan[];
  planCounts: Record<string, number>;
  growthData?: { key: string; label: string; novos: number }[];
}) {
  const planData = useMemo(
    () =>
      plans
        .map((p) => ({ name: p.name || p.code, value: planCounts[p.code] ?? 0 }))
        .filter((d) => d.value > 0),
    [plans, planCounts],
  );

  const growthData = useMemo(() => {
    if (growthDataProp) return growthDataProp;
    if (!users) return [];
    
    const months: { key: string; label: string; novos: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        novos: 0,
      });
    }
    for (const u of users) {
      const created = u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt);
      if (Number.isNaN(created.getTime())) continue;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) bucket.novos += 1;
    }
    return months;
  }, [users, growthDataProp]);

  const hasData = planData.length > 0 || growthData.length > 0;
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-primary" />
          Assinaturas por plano
        </h3>
        {planData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Nenhum usuário ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={planData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {planData.map((_, i) => (
                  <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number, n: string) => [`${v} usuário(s)`, n]}
                contentStyle={{ borderRadius: 10, border: "1px solid rgba(120,120,120,.25)", background: "hsl(var(--card))" }}
              />
              <Legend verticalAlign="bottom" height={24} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Novos usuários (6 meses)
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={growthData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
            <Tooltip
              cursor={{ fill: "rgba(212,175,55,.08)" }}
              formatter={(v: number) => [`${v} novo(s)`, "Cadastros"]}
              contentStyle={{ borderRadius: 10, border: "1px solid rgba(120,120,120,.25)", background: "hsl(var(--card))" }}
            />
            <Bar dataKey="novos" fill="#D4AF37" radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
