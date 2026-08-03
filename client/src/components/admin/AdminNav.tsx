import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  FileSpreadsheet,
  DollarSign,
  FolderKanban,
  Palette,
  Dice1,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface AdminSection {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Seções do painel administrativo. Fonte única usada tanto pelo menu lateral
 * quanto pela busca rápida (Ctrl/Cmd + K), pra nunca ficarem dessincronizados.
 */
export const ADMIN_SECTIONS: AdminSection[] = [
  { value: "overview", label: "Dashboard", description: "Métricas, receita e uso da IA", icon: LayoutDashboard },
  { value: "users", label: "Usuários", description: "Buscar, editar, suspender e dar upgrade", icon: Users },
  { value: "templates", label: "Modelos", description: "Planilhas prontas e colunas", icon: FileSpreadsheet },
  { value: "plans", label: "Planos e Preços", description: "Preços, limites e benefícios", icon: DollarSign },
  { value: "categories", label: "Categorias", description: "Organização dos modelos", icon: FolderKanban },
  { value: "colors", label: "Cores", description: "Temas visuais por plano", icon: Palette },
  { value: "draw", label: "Sorteio", description: "Sortear e presentear upgrades", icon: Dice1 },
  { value: "admins", label: "Administradores", description: "Quem tem acesso ao painel", icon: ShieldAlert },
];

interface AdminSidebarProps {
  section: string;
  onSectionChange: (value: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenSearch: () => void;
}

/**
 * Menu lateral retrátil do painel (inspirado em Vercel/Notion): navegação
 * rápida, ícones sempre visíveis quando recolhido e atalho pra busca rápida.
 */
export function AdminSidebar({
  section,
  onSectionChange,
  collapsed,
  onToggleCollapsed,
  onOpenSearch,
}: AdminSidebarProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 232 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="hidden md:flex shrink-0 flex-col gap-2 self-start sticky top-4 rounded-xl border border-border/40 bg-card/40 backdrop-blur p-2 overflow-hidden"
      >
        <div className={cn("flex items-center gap-1", collapsed ? "justify-center" : "justify-between px-1")}>
          {!collapsed && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Painel</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onOpenSearch}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 text-muted-foreground text-sm transition-colors hover:border-primary/40 hover:text-foreground",
                collapsed ? "justify-center h-9 w-full" : "px-2.5 py-2",
              )}
            >
              <Search className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Buscar...</span>
                  <kbd className="rounded border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
                </>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Busca rápida (⌘K)</TooltipContent>}
        </Tooltip>

        <nav className="flex flex-col gap-0.5">
          {ADMIN_SECTIONS.map((item) => {
            const Icon = item.icon;
            const isActive = section === item.value;
            const button = (
              <button
                key={item.value}
                type="button"
                onClick={() => onSectionChange(item.value)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center h-9 w-full" : "px-2.5 py-2",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/25"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <Icon className="h-4 w-4 shrink-0 relative z-10" />
                {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
              </button>
            );

            return collapsed ? (
              <Tooltip key={item.value}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              button
            );
          })}
        </nav>
      </motion.aside>
    </TooltipProvider>
  );
}

/**
 * Navegação em pílulas para telas pequenas (o menu lateral fica oculto).
 */
export function AdminMobileNav({ section, onSectionChange }: { section: string; onSectionChange: (v: string) => void }) {
  return (
    <div className="md:hidden -mx-1 flex gap-1.5 overflow-x-auto pb-1 px-1">
      {ADMIN_SECTIONS.map((item) => {
        const Icon = item.icon;
        const isActive = section === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSectionChange(item.value)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
