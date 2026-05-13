import React from "react";
import { Navbar } from "components/layout/Navbar";
import { Footer } from "components/layout/Footer";
import { motion } from "framer-motion";
import { Button } from "components/ui/button";
import { MapPin, Ticket, Calendar, Smartphone, Star, Quote } from "lucide-react";
import { useLanguage } from "lib/i18n";

export default function Home() {
  const { t } = useLanguage();

  const features = [
    { icon: Calendar, title: t("home.features.f1.title"), desc: t("home.features.f1.desc") },
    { icon: Ticket, title: t("home.features.f2.title"), desc: t("home.features.f2.desc") },
    { icon: MapPin, title: t("home.features.f3.title"), desc: t("home.features.f3.desc") },
    { icon: Smartphone, title: t("home.features.f4.title"), desc: t("home.features.f4.desc") },
  ];

  const appItems = [
    t("home.app.li1"),
    t("home.app.li2"),
    t("home.app.li3"),
    t("home.app.li4"),
  ];

  const plans = [
    {
      name: t("home.pricing.p1.name"),
      price: "0 FCFA",
      desc: t("home.pricing.p1.desc"),
      features: [t("home.pricing.p1.f1"), t("home.pricing.p1.f2"), t("home.pricing.p1.f3")],
    },
    {
      name: t("home.pricing.p2.name"),
      price: "15 000 FCFA",
      suffix: t("home.pricing.p2.suffix"),
      desc: t("home.pricing.p2.desc"),
      popular: true,
      features: [
        t("home.pricing.p2.f1"),
        t("home.pricing.p2.f2"),
        t("home.pricing.p2.f3"),
        t("home.pricing.p2.f4"),
      ],
    },
    {
      name: t("home.pricing.p3.name"),
      price: "45 000 FCFA",
      suffix: t("home.pricing.p3.suffix"),
      desc: t("home.pricing.p3.desc"),
      features: [
        t("home.pricing.p3.f1"),
        t("home.pricing.p3.f2"),
        t("home.pricing.p3.f3"),
        t("home.pricing.p3.f4"),
      ],
    },
  ];

  const testimonials = [
    { quote: t("home.testimonials.t1.quote"), name: "Komi A.", role: t("home.testimonials.t1.role"), initials: "KA" },
    { quote: t("home.testimonials.t2.quote"), name: "Afiwa D.", role: t("home.testimonials.t2.role"), initials: "AD" },
    { quote: t("home.testimonials.t3.quote"), name: "Marc T.", role: t("home.testimonials.t3.role"), initials: "MT" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 pt-16">
        {/* Hero */}
        <section className="relative py-24 md:py-32 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-background/80 z-10" />
            <img src="/images/hero-club.png" alt="Nightclub scene" className="w-full h-full object-cover" />
          </div>

          <div className="container mx-auto px-4 relative z-20">
            <div className="max-w-3xl">
              <motion.h1
                className="text-5xl md:text-7xl font-bold mb-6 text-foreground leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                {t("home.hero.title")} <span className="text-primary">{t("home.hero.country")}</span>{t("home.hero.title2")}
              </motion.h1>
              <motion.p
                className="text-xl md:text-2xl text-muted-foreground mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {t("home.hero.sub")}
              </motion.p>
              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8">
                  {t("home.hero.appstore")}
                </Button>
                <Button size="lg" variant="outline" className="text-lg px-8 bg-card/50 backdrop-blur border-primary/20 hover:bg-card/80">
                  {t("home.hero.googleplay")}
                </Button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">{t("home.features.title")}</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t("home.features.sub")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {features.map((feature, i) => (
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

        {/* App Mockup */}
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
                <h2 className="text-3xl md:text-5xl font-bold mb-6">{t("home.app.title")}</h2>
                <p className="text-xl text-muted-foreground mb-8">{t("home.app.sub")}</p>
                <ul className="space-y-4">
                  {appItems.map((item, i) => (
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

        {/* Pricing */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">{t("home.pricing.title")}</h2>
              <p className="text-muted-foreground text-xl max-w-2xl mx-auto">{t("home.pricing.sub")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <div key={i} className={`p-8 rounded-2xl border ${plan.popular ? "border-primary bg-card relative" : "border-border bg-card"}`}>
                  {plan.popular && (
                    <span className="absolute top-0 right-8 -translate-y-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                      {t("home.pricing.popular")}
                    </span>
                  )}
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
                  <Button
                    className={`w-full ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background hover:bg-muted text-foreground"}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {t("home.pricing.cta")}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-card overflow-hidden">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-5xl font-bold mb-16 text-center">{t("home.testimonials.title")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, i) => (
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
            <h2 className="text-4xl md:text-6xl font-bold mb-8">{t("home.cta.title")}</h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">{t("home.cta.sub")}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-lg px-8 h-14">
                {t("home.cta.ios")}
              </Button>
              <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 text-lg px-8 h-14">
                {t("home.cta.android")}
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
