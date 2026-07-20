import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Library, Sparkles, TrendingUp, FileDown, Zap, Shield, Palette
} from "lucide-react";

interface PlanBenefitsCardProps {
  planName: string;
  templatesUnlocked: number;
  totalTemplates: number;
  themesUnlocked: number;
  aiUsesLeft: number;
  maxAiUses: number;
  customLogo: boolean;
  hasWatermark: boolean;
  unlimitedSheets: boolean;
  sheetsGeneratedThisMonth: number;
  planFeatures: string[];
}

export default function PlanBenefitsCard({
  planName,
  templatesUnlocked,
  totalTemplates,
  themesUnlocked,
  aiUsesLeft,
  maxAiUses,
  customLogo,
  hasWatermark,
  unlimitedSheets,
  sheetsGeneratedThisMonth,
  planFeatures,
}: PlanBenefitsCardProps) {
  const benefits = [
    {
      icon: Library,
      label: "Modelos desbloqueados",
      value: `${templatesUnlocked}/${totalTemplates}`,
      color: "text-blue-500",
    },
    {
      icon: Sparkles,
      label: "Temas disponíveis",
      value: themesUnlocked.toString(),
      color: "text-purple-500",
    },
    {
      icon: Zap,
      label: "Gerações com IA",
      value: `${aiUsesLeft}/${maxAiUses}`,
      color: "text-yellow-500",
    },
    {
      icon: FileDown,
      label: "Planilhas este mês",
      value: unlimitedSheets ? "Ilimitadas" : sheetsGeneratedThisMonth.toString(),
      color: "text-green-500",
    },
    {
      icon: Palette,
      label: "Logo personalizado",
      value: customLogo ? "Sim" : "Não",
      color: customLogo ? "text-green-500" : "text-muted-foreground",
    },
    {
      icon: Shield,
      label: "Marca d'água",
      value: hasWatermark ? "Sim" : "Não",
      color: hasWatermark ? "text-orange-500" : "text-green-500",
    },
  ];

  return (
    <Card className="p-6 bg-card/50 border-border/30">
      <h3 className="text-lg font-semibold mb-6">Benefícios do seu plano</h3>

      {/* Benefits Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {benefits.map((benefit, idx) => {
          const Icon = benefit.icon;
          return (
            <div key={idx} className="p-4 rounded-lg bg-accent/30 border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${benefit.color}`} />
                <p className="text-xs text-muted-foreground font-medium">{benefit.label}</p>
              </div>
              <p className="text-xl font-bold">{benefit.value}</p>
            </div>
          );
        })}
      </div>

      {/* Features List */}
      {planFeatures.length > 0 && (
        <div className="pt-4 border-t border-border/30">
          <h4 className="text-sm font-semibold mb-3">Recursos inclusos</h4>
          <ul className="space-y-2">
            {planFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
