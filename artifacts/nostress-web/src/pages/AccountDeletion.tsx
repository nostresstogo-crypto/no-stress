import React, { useState } from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import { Button } from "components/ui/button";
import { Input } from "components/ui/input";
import { Label } from "components/ui/label";
import { Checkbox } from "components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/ui/select";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AccountDeletion() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-4xl font-bold mb-4 text-primary">Demande de suppression de compte</h1>
          <p className="text-muted-foreground mb-8 text-lg">
            Nous sommes désolés de vous voir partir. La suppression de votre compte entraînera la perte définitive de toutes vos données.
          </p>

          {submitted ? (
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Demande reçue</h2>
              <p className="text-muted-foreground mb-6">
                Votre demande de suppression de compte a été enregistrée. Elle sera traitée dans un délai de 48 à 72 heures ouvrées.
              </p>
              <p className="text-sm text-muted-foreground">
                Si vous avez des questions, contactez-nous à <span className="text-primary">contact@nostress.tg</span>
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 md:p-8">
              <div className="flex gap-4 items-start bg-destructive/10 border border-destructive/20 p-4 rounded-lg mb-8">
                <AlertTriangle className="text-destructive w-6 h-6 shrink-0 mt-1" />
                <div className="text-sm">
                  <p className="font-semibold text-destructive mb-1">Attention : Action irréversible</p>
                  <p className="text-muted-foreground">
                    La suppression de votre compte effacera toutes vos données personnelles, vos billets achetés non utilisés, et votre historique. Pour les partenaires, vos événements seront retirés de la plateforme.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom complet</Label>
                    <Input id="name" required placeholder="Votre nom tel qu'il apparaît sur l'application" className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse e-mail associée au compte</Label>
                    <Input id="email" type="email" required placeholder="email@exemple.com" className="bg-background" />
                  </div>

                  <div className="space-y-2">
                    <Label>Type de compte</Label>
                    <Select required defaultValue="user">
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Sélectionnez le type de compte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utilisateur (Application mobile)</SelectItem>
                        <SelectItem value="partner">Partenaire / Structure (Organisateur)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Raison de la suppression (Optionnel)</Label>
                    <Select>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Pourquoi souhaitez-vous nous quitter ?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_useful">L'application ne m'est pas utile</SelectItem>
                        <SelectItem value="privacy">Préoccupations liées à la vie privée</SelectItem>
                        <SelectItem value="too_many_emails">Trop de notifications</SelectItem>
                        <SelectItem value="other">Autre raison</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start space-x-3 pt-4 border-t border-border">
                  <Checkbox id="confirm" required className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="confirm" className="text-base font-medium">
                      Je confirme vouloir supprimer définitivement mon compte
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Je comprends que cette action est irréversible et que je perdrai l'accès à tous mes billets.
                    </p>
                  </div>
                </div>

                <Button type="submit" variant="destructive" className="w-full h-12 text-lg font-semibold">
                  Soumettre la demande de suppression
                </Button>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
