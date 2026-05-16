import { Router } from "express";
import { db, eventsTable, venuesTable, citiesTable } from "@workspace/db";
import { eq, ilike, and, gte, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `Tu es l'assistant IA de NoStress, une application de découverte d'événements et de lieux partout dans le monde.

Ton rôle :
- Aider les utilisateurs à trouver des événements et des lieux à proximité
- Répondre aux questions sur le fonctionnement de l'app NoStress
- Donner des recommandations personnalisées
- Être chaleureux, bref et utile

Fonctionnement de l'app NoStress :
- Découvrir des événements (concerts, soirées, festivals, sport, culture) et des lieux (restaurants, bars, clubs, hotels) partout dans le monde
- Acheter des billets directement dans l'app
- Filtrer par ville, catégorie, date
- Les partenaires (organisateurs) peuvent créer et publier des événements
- Les propriétaires de locaux (bars, restaurants, boites de nuit, etc.) peuvent référencer leur établissement sur l'app pour le rendre visible aux utilisateurs
- L'app est disponible dans toutes les villes où des partenaires sont actifs

Règles :
- Réponds toujours en français sauf si l'utilisateur parle anglais
- Sois concis (3-4 phrases max par réponse)
- Si l'utilisateur demande des événements ou des lieux, utilise les données contextuelles fournies
- Ne fabrique pas de données que tu n'as pas
- Si tu n'as pas d'info précise, invite l'utilisateur à explorer l'onglet Accueil ou Lieux dans l'app`;

router.post("/openai/chat", async (req, res) => {
  try {
    const { message, history = [], city } = req.body as {
      message: string;
      history?: { role: "user" | "assistant"; content: string }[];
      city?: string;
    };

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message requis" });
    }

    const cityName = city ? city.split(",")[0].trim() : null;

    let contextBlock = "";
    if (cityName) {
      try {
        const today = new Date();
        const [events, venues] = await Promise.all([
          db
            .select({
              title: eventsTable.title,
              date: eventsTable.date,
              category: eventsTable.category,
              city: eventsTable.city,
            })
            .from(eventsTable)
            .where(
              and(
                eq(eventsTable.status, "approved"),
                gte(eventsTable.date, today),
                ilike(eventsTable.city, `%${cityName}%`)
              )
            )
            .orderBy(eventsTable.date)
            .limit(8),
          db
            .select({
              name: venuesTable.name,
              type: venuesTable.type,
              city: venuesTable.city,
            })
            .from(venuesTable)
            .where(
              and(
                eq(venuesTable.status, "approved"),
                ilike(venuesTable.city, `%${cityName}%`)
              )
            )
            .limit(8),
        ]);

        if (events.length > 0) {
          contextBlock += `\n\nÉvénements à venir à ${cityName} :\n`;
          events.forEach((e) => {
            const dateStr = e.date
              ? new Date(e.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })
              : "date à confirmer";
            contextBlock += `- ${e.title} (${e.category || "événement"}) — ${dateStr}\n`;
          });
        }

        if (venues.length > 0) {
          contextBlock += `\nLieux disponibles à ${cityName} :\n`;
          venues.forEach((v) => {
            contextBlock += `- ${v.name} (${v.type || "lieu"})\n`;
          });
        }

        if (events.length === 0 && venues.length === 0) {
          contextBlock += `\n\nAucun événement ou lieu trouvé pour ${cityName} pour le moment.`;
        }
      } catch {
        // ignore context fetch errors
      }
    }

    const systemContent = SYSTEM_PROMPT + contextBlock;

    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: systemContent },
      ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ content: "\n\nVous avez d'autres questions ? N'hésitez pas, posez toutes vos questions, je suis là pour vous aider 😊" })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur IA", detail: err?.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Erreur IA" })}\n\n`);
      res.end();
    }
  }
});

export default router;
