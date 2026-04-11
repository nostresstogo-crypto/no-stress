import React from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, Ticket, Calendar, Smartphone, Star, Quote } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-background/80 z-10" />
            <img 
              src="/images/hero-club.png" 
              alt="Nightclub scene" 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="container mx-auto px-4 relative z-20">
            <div className="max-w-3xl">
              <motion.h1 
                className="text-5xl md:text-7xl font-bold mb-6 text-foreground leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Vivez l'énergie du <span className="text-primary">Togo</span>, sans stress.
              </motion.h1>
              <motion.p 
                className="text-xl md:text-2xl text-muted-foreground mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                Découvrez les meilleurs concerts, festivals, et soirées. Le pouls de la vie nocturne togolaise dans votre poche.
              </motion.p>
              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8">
                  App Store
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 bg-card/50 backdrop-blur border-primary/20 hover:bg-card/80">
                  Google Play
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Tout ce qu'il vous faut pour sortir</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                NoStress simplifie votre vie sociale de la découverte à l'achat de billets.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { icon: Calendar, title: "Découverte", desc: "Trouvez des événements exclusifs et des soirées secrètes." },
                { icon: Ticket, title: "Billetterie Mobile", desc: "Achetez vos tickets via Flooz, T-Money ou MIX by YAS." },
                { icon: MapPin, title: "Carte Interactive", desc: "Localisez les lieux les plus chauds autour de vous." },
                { icon: Smartphone, title: "Espace Partenaire", desc: "Gérez vos événements directement depuis l'application." }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  className="p-8 rounded-2xl bg-background border border-border hover:border-primary/50 transition-colors"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <feature.icon className="w-12 h-12 text-secondary mb-6" />
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* App Mockup Section */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <motion.div 
                className="flex-1"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-3xl md:text-5xl font-bold mb-6">L'expérience NoStress au bout des doigts</h2>
                <p className="text-xl text-muted-foreground mb-8">
                  Une interface fluide, pensée pour la nuit. Feuilletez les événements à venir, sauvegardez vos favoris et achetez vos tickets en un clic, sans quitter l'application.
                </p>
                <ul className="space-y-4">
                  {[
                    "Scanner de QR code intégré pour un accès rapide",
                    "Notifications en temps réel pour vos artistes préférés",
                    "Paiement sécurisé 100% togolais",
                    "Mode sombre exclusif pour le confort visuel"
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">✓</div>
                      <span className="text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              <motion.div 
                className="flex-1 relative"
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full" />
                <img 
                  src="/images/beach-party.png" 
                  alt="App interface preview" 
                  className="relative z-10 w-full max-w-md mx-auto rounded-3xl border-8 border-border shadow-2xl"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Cities */}
        <section className="py-24 bg-card border-y border-border">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-12">Le Togo vibre avec nous</h2>
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {[
                { name: "Lomé", color: "bg-[#006A4E]/20 text-[#006A4E] border-[#006A4E]/30 dark:text-[#006A4E] dark:bg-[#006A4E]/20" },
                { name: "Kpalimé", color: "bg-[#FFCD00]/20 text-[#FFCD00] border-[#FFCD00]/30 dark:text-[#FFCD00] dark:bg-[#FFCD00]/20" },
                { name: "Kara", color: "bg-[#D21034]/20 text-[#D21034] border-[#D21034]/30 dark:text-[#D21034] dark:bg-[#D21034]/20" },
                { name: "Aného", color: "bg-primary/20 text-primary border-primary/30" },
                { name: "Sokodé", color: "bg-secondary/20 text-secondary border-secondary/30" },
                { name: "Atakpamé", color: "bg-muted text-foreground border-border" }
              ].map((city, i) => (
                <motion.div 
                  key={city.name}
                  className={`px-8 py-4 rounded-full border text-xl font-bold ${city.color}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  {city.name}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Pour les Organisateurs</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
                Gérez vos événements, scannez les billets et suivez vos ventes en temps réel.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                { name: "Gratuit", price: "0 FCFA", desc: "Pour les petits événements", features: ["1 événement actif", "Scan de billets basique", "Support par email"] },
                { name: "Pro", price: "15 000 FCFA", suffix: "/mois", desc: "Pour les clubs et promoteurs", popular: true, features: ["Événements illimités", "Paiements T-Money/Flooz", "Dashboard analytique", "Support prioritaire"] },
                { name: "Premium", price: "45 000 FCFA", suffix: "/mois", desc: "Pour les grands festivals", features: ["Fonctions Pro", "Mise en avant sur l'app", "Accès API", "Account manager dédié"] }
              ].map((plan, i) => (
                <div key={i} className={`p-8 rounded-2xl border ${plan.popular ? 'border-primary bg-card relative' : 'border-border bg-card'}`}>
                  {plan.popular && <span className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold shadow-lg">Populaire</span>}
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-6">{plan.desc}</p>
                  <div className="mb-8">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.suffix && <span className="text-muted-foreground">{plan.suffix}</span>}
                  </div>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className={`w-full ${plan.popular ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-muted text-foreground'}`} variant={plan.popular ? 'default' : 'outline'}>
                    Commencer
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-card overflow-hidden">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">Ce qu'ils en disent</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { 
                  quote: "Enfin une appli qui comprend comment on fait la fête à Lomé ! Je n'ai plus besoin de faire la queue pour mes billets, tout se passe sur T-Money directement dans l'app.", 
                  name: "Komi A.", 
                  role: "Étudiant",
                  initials: "KA"
                },
                { 
                  quote: "En tant que gérante de club, NoStress m'a permis de doubler ma visibilité le week-end. Le scan des billets à l'entrée est ultra rapide, fini les embouteillages.", 
                  name: "Afiwa D.", 
                  role: "Propriétaire de Club",
                  initials: "AD"
                },
                { 
                  quote: "J'ai découvert des festivals incroyables à Kpalimé que je n'aurais jamais trouvés autrement. L'interface est magnifique et super fluide.", 
                  name: "Marc T.", 
                  role: "Designer",
                  initials: "MT"
                }
              ].map((testimonial, i) => (
                <motion.div 
                  key={i}
                  className="bg-background p-8 rounded-2xl border border-border relative"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <Quote className="w-10 h-10 text-primary/20 absolute top-6 right-6" />
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-5 h-5 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-lg text-muted-foreground mb-8 relative z-10 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">
                      {testimonial.initials}
                    </div>
                    <div>
                      <p className="font-bold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-background relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="/images/festival.png" 
              alt="Festival crowd" 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-8">Prêt à sortir ?</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Rejoignez des milliers de togolais qui utilisent NoStress pour planifier leurs week-ends.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 h-14">
                Télécharger pour iOS
              </Button>
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 h-14">
                Télécharger pour Android
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
