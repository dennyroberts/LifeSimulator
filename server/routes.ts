import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/generate-obituary", async (req, res) => {
    try {
      const { name, traits, stages, lifetimeEarnings, careerField } = req.body;
      
      if (!traits || !stages || lifetimeEarnings === undefined) {
        return res.status(400).json({ error: "Missing required simulation data" });
      }

      const lifeEventsDescription = stages.map((stage: any) => {
        const age = stage.age;
        const eventName = stage.education?.outcome || stage.career?.outcome || stage.event?.event?.name || "Unknown event";
        const success = stage.education?.success ?? stage.career?.success ?? stage.event?.success ?? true;
        const outcome = stage.education?.outcomeMessage || stage.career?.outcomeMessage || stage.event?.outcomeMessage || "";
        const income = stage.incomeAfter;
        return `Age ${age}: ${eventName} (${success ? 'Success' : 'Failure'}) - ${outcome} [Income: $${income?.toLocaleString() || 'N/A'}]`;
      }).join("\n");

      const prompt = `Write a short, 2–3 sentence satirical obituary-style biography of a fictional person based on the following life simulation data. The tone should be wry, clever, and dryly humorous—like a mix between The New Yorker's Shouts & Murmurs, an NPR weekend profile, and a rogue D&D bard giving a eulogy.

The character is defined by:

Five traits (INT, WORK, NEPO, CHAR, RISK), each on a scale from 0–20

Their lifetime earnings

Their assigned career field (e.g., "Tech," "Retail," "Doctor")

A timeline of nine life events

The first sentence should summarize their general personality and background, including any notable strengths or weaknesses drawn from their traits (e.g., brilliant but antisocial, charming but unfocused, etc), and mention their career field.

The second and third sentences should describe each life event in order, adding humor and specificity about what happened at each life stage (ages 18–66). You should interpret any successes or failures with playful speculation, adding made-up but fitting details—like names of companies (or inventions, partners, specific job as fits their life events), quirky rationales for decisions, what the person was sued or arrested for if they were sued or arrested, or how things turned out.

Avoid generic phrasing and clichés—this should feel vivid, human, and lightly absurd.

CHARACTER DATA:
Name: ${name}
Career Field: ${careerField || "General"}
Lifetime Earnings: $${lifetimeEarnings?.toLocaleString()}

Traits:
- INT (Intelligence): ${traits.INT}/20
- WORK (Work Ethic): ${traits.WORK}/20
- NEPO (Nepotism/Connections): ${traits.NEPO}/20
- CHAR (Charisma): ${traits.CHAR}/20
- RISK (Risk Tolerance): ${traits.RISK}/20

Life Timeline:
${lifeEventsDescription}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.9,
      });

      const obituary = response.choices[0]?.message?.content || "No biography generated.";
      
      res.json({ obituary });
    } catch (error: any) {
      console.error("Error generating obituary:", error);
      res.status(500).json({ error: "Failed to generate biography" });
    }
  });

  return httpServer;
}
