import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Mail, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface ProfileCardProps {
  userName: string;
  userEmail: string;
  userPhotoUrl: string | null;
  plan: "free" | "pro" | "elite";
  planName: string;
  planExpiresAt: string | null;
  planDescription: string;
}

export default function ProfileCard({
  userName,
  userEmail,
  userPhotoUrl,
  plan,
  planName,
  planExpiresAt,
  planDescription,
}: ProfileCardProps) {
  const planBadgeColor: Record<"free" | "pro" | "elite", string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary/15 text-primary",
    elite: "bg-gold-gradient text-black",
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  return (
    <Card className="p-6 bg-card/50 border-border/30">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center sm:items-start gap-4">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            {userPhotoUrl && <AvatarImage src={userPhotoUrl} alt={userName} />}
            <AvatarFallback className="text-lg font-semibold">
              {userName?.charAt(0).toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <Link href="/dashboard/config">
            <Button variant="outline" size="sm">
              Editar perfil
            </Button>
          </Link>
        </div>

        {/* Profile Info Section */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{userName}</h2>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <Mail className="w-4 h-4" />
              <span className="text-sm">{userEmail}</span>
            </div>
          </div>

          {/* Plan Info */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Plano atual</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${planBadgeColor[plan]} font-semibold`}>
                    <Crown className="w-3 h-3 mr-1" />
                    {planName}
                  </Badge>
                </div>
              </div>
              {plan !== "elite" && (
                <Link href="/#planos">
                  <Button variant="outline" size="sm" className="border-primary/30 text-primary">
                    Fazer upgrade
                  </Button>
                </Link>
              )}
            </div>

            {planDescription && (
              <p className="text-sm text-muted-foreground italic">{planDescription}</p>
            )}

            {planExpiresAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/30 p-3 rounded-lg">
                <Calendar className="w-4 h-4 text-primary" />
                <span>
                  Plano expira em: <span className="font-semibold">{formatDate(planExpiresAt)}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
