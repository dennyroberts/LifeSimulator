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

      const traitsList = [
        { name: 'Intelligence', value: traits.INT },
        { name: 'Work Ethic', value: traits.WORK },
        { name: 'Connections', value: traits.NEPO },
        { name: 'Charisma', value: traits.CHAR },
        { name: 'Risk Tolerance', value: traits.RISK },
      ];
      const sortedTraits = [...traitsList].sort((a, b) => b.value - a.value);
      const highestTrait = sortedTraits[0];
      const lowestTrait = sortedTraits[sortedTraits.length - 1];

      const prompt = `Write an author-style biography blurb for a fictional person based on the life simulation data below.

STRUCTURE:
1. First sentence: Open with their name, mention their career as a ${careerName}, and highlight their most notable trait (${highestTrait.name}: ${highestTrait.value}/20) and their weakest trait (${lowestTrait.name}: ${lowestTrait.value}/20).
2. Following sentences: Cover EVERY life event from the timeline below, in chronological order, mentioning the specific age each happened. Add colorful, specific details (invent restaurant names, company names, specific circumstances) but only for events that actually appear in the timeline.

RULES:
- Mention ALL life events in order with specific ages.
- Invent specific fun details: restaurant names, company names, what exactly they got arrested for, etc.
- Tone: colorful and specific, like a New Yorker author bio. Wry but not reaching for jokes.
- Do NOT treat this as an obituary. No death, no "passed away."
- Do NOT mention dollar amounts or lifetime earnings.
- Only use events from the timeline - do not invent new events.

CHARACTER:
Name: ${name}
Career: ${careerName}
Strongest trait: ${highestTrait.name} (${highestTrait.value}/20)
Weakest trait: ${lowestTrait.name} (${lowestTrait.value}/20)

All Traits (0-20 scale):
- Intelligence: ${traits.INT}
- Work Ethic: ${traits.WORK}
- Connections: ${traits.NEPO}
- Charisma: ${traits.CHAR}
- Risk Tolerance: ${traits.RISK}

Life Timeline (cover ALL of these in order):
${lifeEventsDescription}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 350,
        temperature: 0.8,
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
