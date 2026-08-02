import { BadgeCheck, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanVerifiedBadgeProps {
  /** Código do plano (free/pro/elite ou qualquer código cadastrado no admin). */
  plan?: string | null;
  /** px size of the icon */
  size?: number;
  className?: string;
}

/** Códigos tratados como plano gratuito (sem selo). */
const FREE_CODES = new Set(["free", "gratis", "gratuito", "basico", "basic", "", "none"]);
/** Códigos tratados como plano topo de linha (selo dourado). */
const ELITE_CODES = new Set(["elite", "premium", "vip", "diamond", "diamante"]);

/**
 * Selo exclusivo exibido ao lado do nome do usuário conforme o plano:
 * - FREE (ou plano ausente/desconhecido como gratuito): sem selo.
 * - ELITE (e equivalentes premium): selo exclusivo (gema dourada com brilho).
 * - Qualquer outro plano pago (PRO e planos customizados): selo verificado azul.
 */
export default function PlanVerifiedBadge({ plan, size = 16, className }: PlanVerifiedBadgeProps) {
  const code = (plan ?? "").toString().trim().toLowerCase();

  if (!code || FREE_CODES.has(code)) return null;

  if (ELITE_CODES.has(code)) {
    return (
      <span
        aria-label="Membro ELITE — selo premium exclusivo"
        title="Membro ELITE — selo premium exclusivo"
        className={cn(
          "inline-flex items-center justify-center shrink-0 align-middle drop-shadow-[0_0_4px_rgba(212,175,55,0.7)]",
          className,
        )}
      >
        <Gem style={{ width: size, height: size }} className="text-[#D4AF37] fill-[#D4AF37]" />
      </span>
    );
  }

  return (
    <span
      aria-label="Membro verificado — plano pago"
      title="Membro verificado — plano pago"
      className={cn("inline-flex items-center justify-center shrink-0 align-middle", className)}
    >
      <BadgeCheck style={{ width: size, height: size }} className="text-blue-500 fill-blue-500/20" />
    </span>
  );
}
