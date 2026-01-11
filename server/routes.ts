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

      const prompt = `Write a brief author-bio blurb for this fictional person. Keep it SHORT (4-6 sentences max).

${name} worked as a ${careerName}. Their strongest trait was ${highestTrait.name}, their weakest was ${lowestTrait.name}.

Here is their complete life timeline. Reference ONLY these events - do NOT add any events at other ages:
${lifeEventsDescription}

Write the bio now. Rules:
- First sentence: name, career, and personality based on strongest/weakest traits
- Then briefly cover each event above with its age, adding a colorful detail (a name, place, or circumstance)
- ONLY use the ages listed above (18, 24, 30, 36, 42, 48, 54, 60, 66). Do NOT invent events at ages like 22, 28, 32, etc.
- Keep it concise. No obituary language. No dollar amounts.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 300,
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
