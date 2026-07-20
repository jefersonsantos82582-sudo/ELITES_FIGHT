import { Crown, Settings as SettingsIcon, User, Mail, Shield } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: overview } = trpc.dashboard.overview.useQuery();

  const planBadgeColor = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/15 text-primary",
    elite: "bg-gold-gradient text-black",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-primary" />
            Configurações
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seu perfil e preferências
          </p>
        </div>

        {/* Profile */}
        <Card className="p-6 bg-card/50 border-border/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Perfil
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={user?.name || ""} disabled className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={user?.email || ""} disabled className="mt-1.5" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Seu perfil é gerenciado pela sua conta do Google via Firebase.
          </p>
        </Card>

        {/* Plan */}
        <Card className="p-6 bg-card/50 border-border/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Plano atual
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge className={`${planBadgeColor[overview?.plan || "free"]} font-semibold`}>
                {overview?.planName || "FREE"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {overview?.unlimitedSheets ? "Planilhas ilimitadas" : "1 planilha por mês"}
              </span>
            </div>
            <a href="/#planos">
              <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                <Crown className="w-3.5 h-3.5 mr-1.5" />
                Fazer upgrade
              </Button>
            </a>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Modelos:</span>
              <span className="font-medium ml-2">{overview?.templatesUnlocked || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Temas:</span>
              <span className="font-medium ml-2">{overview?.themesUnlocked || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">IA:</span>
              <span className="font-medium ml-2">{overview?.aiUsesLeft || 0} usos</span>
            </div>
          </div>
        </Card>

        {/* Security */}
        <Card className="p-6 bg-card/50 border-border/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Segurança
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sua conta é protegida pela autenticação Firebase Google Login.
          </p>
          <Button variant="outline" onClick={() => { logout(); toast.success("Sessão encerrada"); }}>
            Encerrar sessão
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
}
