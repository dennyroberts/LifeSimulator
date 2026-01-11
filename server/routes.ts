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

      const prompt = `Write a short author-style biography blurb (3-5 sentences) for a fictional person based on the life simulation data below.

STRUCTURE:
1. First sentence: Their name, career as a ${careerName}, and personality based on their strongest trait (${highestTrait.name}) and weakest trait (${lowestTrait.name}).
2. Remaining sentences: Summarize the life events below, adding colorful specifics (restaurant names, company names, etc.) but ONLY for the events listed. You may combine multiple events into one sentence.

CRITICAL RULES:
- ONLY mention ages that appear in the timeline below (18, 24, 30, 36, 42, 48, 54, 60, 66). Do NOT invent events at other ages.
- Add colorful details to the events that exist, but do not add new events.
- Keep it concise - aim for 3-5 sentences total.
- Tone: colorful and specific, wry but not trying hard to be funny.
- No obituary language. No death references.
- No dollar amounts.

CHARACTER:
Name: ${name}
Career: ${careerName}
Strongest: ${highestTrait.name} (${highestTrait.value}/20)
Weakest: ${lowestTrait.name} (${lowestTrait.value}/20)

Life Timeline (ONLY reference these events):
${lifeEventsDescription}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 250,
        temperature: 0.75,
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
