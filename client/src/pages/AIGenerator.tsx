import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Sparkles, Crown, Download, Loader2, Check, AlertCircle, Zap,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

export default function AIGenerator() {
  const { user, loading: authLoading } = useAuth();
  const { data: overview } = trpc.dashboard.overview.useQuery(undefined, {
    enabled: !authLoading && Boolean(user),
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const [modelType, setModelType] = useState<"bebidas" | "produtos" | "clientes">("bebidas");
  const [description, setDescription] = useState("");
  const [customName, setCustomName] = useState("");
  const [headerColor, setHeaderColor] = useState("#D4AF37");
  const [accentColor, setAccentColor] = useState("#1A1A1A");
  const [generated, setGenerated] = useState<{ fileUrl: string; fileName: string } | null>(null);

  const userPlan = (user?.plan as "free" | "pro" | "elite") || "free";

  const generateMutation = trpc.generator.generateWithAI.useMutation({
    onSuccess: (data) => {
      setGenerated(data);
      toast.success("Planilha gerada com sucesso com IA!");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao gerar planilha com IA");
    },
  });

  const aiLimits = useMemo(() => {
    const limits = { free: 2, pro: 20, elite: 999999 };
    return limits[userPlan];
  }, [userPlan]);

  const aiUsesLeft = overview?.aiUsesLeft ?? 0;
  const canUseAI = aiUsesLeft > 0 || userPlan === "elite";

  const modelDescriptions = {
    bebidas: "Crie uma planilha profissional para controle de bebidas com categorias, marcas, preços e estoque.",
    produtos: "Gere uma planilha de controle de produtos com SKU, categorias, preços de custo/venda e estoque.",
    clientes: "Construa uma planilha de gestão de clientes com contatos, histórico de compras e categorização.",
  };

  const handleGenerate = () => {
    if (!customName.trim()) {
      toast.error("Digite um nome para sua planilha");
      return;
    }
    if (!description.trim()) {
      toast.error("Descreva o que você quer na planilha");
      return;
    }
    if (!canUseAI) {
      toast.error("Você atingiu o limite de gerações com IA. Faça upgrade para continuar!");
      return;
    }

    setGenerated(null);
    generateMutation.mutate({
      modelType,
      description,
      customName,
      headerColor,
      accentColor,
    });
  };

  const colorPresets = [
    { name: "Ouro Premium", header: "#D4AF37", accent: "#1A1A1A" },
    { name: "Azul Executivo", header: "#1E40AF", accent: "#1E3A8A" },
    { name: "Verde Corporativo", header: "#059669", accent: "#064E3B" },
    { name: "Vermelho Elite", header: "#DC2626", accent: "#7F1D1D" },
    { name: "Roxo Moderno", header: "#7C3AED", accent: "#4C1D95" },
    { name: "Cinza Elegante", header: "#4B5563", accent: "#1F2937" },
  ];

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Gerador com IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Deixe a IA criar a estrutura perfeita para sua planilha
          </p>
        </div>

        {/* AI Usage Alert */}
        {!canUseAI && (
          <Card className="p-4 bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900 dark:text-amber-200">Limite de IA atingido</p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  Você atingiu seu limite mensal de {aiLimits} gerações com IA. Faça upgrade para continuar!
                </p>
              </div>
              <a href="/#planos">
                <Button className="bg-gold-gradient text-black font-semibold hover:opacity-90">
                  <Crown className="w-4 h-4 mr-2" />
                  Fazer upgrade
                </Button>
              </a>
            </div>
          </Card>
        )}

        {/* AI Usage Indicator */}
        <Card className="p-4 bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <div>
                <p className="font-semibold text-sm">Gerações com IA disponíveis</p>
                <p className="text-xs text-muted-foreground">
                  {userPlan === "elite" ? "Ilimitado" : `${aiUsesLeft} de ${aiLimits} por mês`}
                </p>
              </div>
            </div>
            {userPlan !== "elite" && (
              <Badge className="bg-primary/15 text-primary">
                {Math.round((aiUsesLeft / aiLimits) * 100)}% restante
              </Badge>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Choose Model Type */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                <h3 className="font-semibold">Escolha o tipo de planilha</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["bebidas", "produtos", "clientes"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setModelType(type)}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      modelType === type
                        ? "border-primary bg-primary/5"
                        : "border-border/30 hover:border-primary/30"
                    }`}
                  >
                    <p className="font-semibold text-sm capitalize mb-1">{type}</p>
                    <p className="text-xs text-muted-foreground">{modelDescriptions[type]}</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Step 2: Describe */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                <h3 className="font-semibold">Descreva sua necessidade</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customName">Nome da planilha</Label>
                  <Input
                    id="customName"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Ex: Controle de Bebidas - Bar do João"
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descrição detalhada</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder={`Descreva o que você precisa. Exemplo para ${modelType}:\n\n${
                      modelType === "bebidas"
                        ? "Preciso controlar bebidas do meu bar, com categorias (cerveja, vinho, destilado), marcas, tamanhos, preços de custo e venda, estoque atual e mínimo."
                        : modelType === "produtos"
                        ? "Controle de produtos de uma loja de roupas, com SKU, categoria, marca, preço de custo, preço de venda, estoque e fornecedor."
                        : "Gestão de clientes com nome, email, telefone, CPF, endereço, data de cadastro, total gasto e categoria de cliente."
                    }`}
                    className="mt-1.5"
                    rows={4}
                  />
                </div>
              </div>
            </Card>

            {/* Step 3: Customize Colors */}
            <Card className="p-6 bg-card/50 border-border/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</div>
                <h3 className="font-semibold">Personalize as cores</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Tema de cores</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1.5">
                    {colorPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => { setHeaderColor(preset.header); setAccentColor(preset.accent); }}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          headerColor === preset.header
                            ? "border-primary bg-primary/5"
                            : "border-border/30 hover:border-primary/30"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: preset.header }} />
                          <div className="w-5 h-5 rounded" style={{ backgroundColor: preset.accent }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="headerColor">Cor do cabeçalho</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={headerColor}
                        onChange={e => setHeaderColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                      />
                      <Input value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="accentColor">Cor de destaque</Label>
                    <div className="flex items-center gap-2 mt-1.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-border/30 cursor-pointer"
                      />
                      <Input value={accentColor} onChange={e => setAccentColor(e.target.value)} className="flex-1" />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Preview / Generate */}
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 border-border/30 sticky top-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Resumo
              </h3>

              {customName && description ? (
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <p className="font-medium capitalize mt-1">{modelType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium truncate mt-1">{customName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Descrição:</span>
                    <p className="text-xs mt-1 line-clamp-3">{description}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Cores:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: headerColor }} />
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: accentColor }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Preencha os dados para ver o resumo
                  </p>
                </div>
              )}

              <Button
                className="w-full mt-6 bg-gold-gradient text-black font-semibold hover:opacity-90"
                onClick={handleGenerate}
                disabled={!customName || !description || !canUseAI || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Planilha
                  </>
                )}
              </Button>

              {!canUseAI && (
                <p className="text-xs text-primary mt-3 text-center">
                  <AlertCircle className="w-3 h-3 inline mr-1" />
                  Limite de IA atingido
                </p>
              )}

              {generated && (
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Planilha gerada!</span>
                  </div>
                  <a href={generated.fileUrl} download={generated.fileName}>
                    <Button className="w-full" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Baixar {generated.fileName}
                    </Button>
                  </a>
                </div>
              )}
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-blue-500/5 border border-blue-500/20">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Como funciona
              </h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✓ Descreva sua necessidade em detalhes</li>
                <li>✓ A IA gera a estrutura automática</li>
                <li>✓ Personalize as cores conforme desejar</li>
                <li>✓ Baixe a planilha pronta para usar</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
