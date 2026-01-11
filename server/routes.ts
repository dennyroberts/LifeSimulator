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
  
  app.post("/api/generate-biography", async (req, res) => {
    try {
      const { name, traits, stages, careerName } = req.body;
      
      if (!traits || !stages) {
        return res.status(400).json({ error: "Missing required simulation data" });
      }

      const lifeEventsDescription = stages.map((stage: any) => {
        const age = stage.age;
        let eventType = '';
        let eventName = '';
        let outcome = '';
        let success = true;
        
        if (stage.education) {
          eventType = 'Education';
          eventName = stage.education.label;
          outcome = stage.education.outcomeMessage || '';
        } else if (stage.career) {
          eventType = 'Career Placement';
          eventName = stage.career.career?.name || 'Unknown';
          outcome = stage.career.outcomeMessage || '';
          success = true;
        } else if (stage.event) {
          eventType = 'Life Event';
          eventName = stage.event.event?.name || 'Unknown';
          outcome = stage.event.outcomeMessage || '';
          success = stage.event.success ?? true;
        }
        
        return `Age ${age}: [${eventType}] ${eventName} - ${success ? 'Success' : 'Failure'}. ${outcome}`;
      }).join("\n");

      const prompt = `Write a 2-sentence author-style biography blurb for a fictional person based on the life simulation data below.

RULES:
- Be concise and specific. No fluff.
- Mention specific ages when key events happened.
- Only reference events that actually appear in the timeline below. Do not invent events.
- Reflect their actual career field accurately (provided below).
- Tone: wry and colorful, but not trying too hard to be funny. Think New Yorker author bio, not stand-up comedy.
- Do NOT mention death, passing away, or treat this as an obituary.
- Do NOT mention specific dollar amounts or earnings.
- First sentence: personality summary based on traits + their career.
- Second sentence: notable life events from the timeline with ages.

CHARACTER:
Name: ${name}
Career: ${careerName}

Traits (0-20 scale):
- Intelligence: ${traits.INT}
- Work Ethic: ${traits.WORK}
- Connections: ${traits.NEPO}
- Charisma: ${traits.CHAR}
- Risk Tolerance: ${traits.RISK}

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
        max_tokens: 150,
        temperature: 0.7,
      });

      const biography = response.choices[0]?.message?.content || "No biography generated.";
      
      res.json({ biography });
    } catch (error: any) {
      console.error("Error generating biography:", error);
      res.status(500).json({ error: "Failed to generate biography" });
    }
  });

  return httpServer;
}
