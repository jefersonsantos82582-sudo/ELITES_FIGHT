import { BadgeCheck, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanVerifiedBadgeProps {
  plan: string;
  /** px size of the icon */
  size?: number;
  className?: string;
}

/**
 * Selo exclusivo exibido ao lado do nome do usuário conforme o plano:
 * - FREE: sem selo.
 * - PRO: selo verificado (check azul).
 * - ELITE: selo premium exclusivo (gema dourada com brilho).
 */
export default function PlanVerifiedBadge({ plan, size = 16, className }: PlanVerifiedBadgeProps) {
  if (plan === "elite") {
    return (
      <span
        title="Membro ELITE — selo premium exclusivo"
        className={cn("inline-flex items-center justify-center shrink-0 drop-shadow-[0_0_4px_rgba(212,175,55,0.7)]", className)}
      >
        <Gem style={{ width: size, height: size }} className="text-[#D4AF37] fill-[#D4AF37]" />
      </span>
    );
  }

  if (plan === "pro") {
    return (
      <span title="Membro PRO — selo verificado" className={cn("inline-flex items-center justify-center shrink-0", className)}>
        <BadgeCheck style={{ width: size, height: size }} className="text-blue-500 fill-blue-500/20" />
      </span>
    );
  }

  return null;
}
