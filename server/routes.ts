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

      console.log("Life events being sent to OpenAI:", lifeEventsDescription);

      const prompt = `Write a biography for ${name}, a ${careerName} known for their ${highestTrait.name} but lacking in ${lowestTrait.name}.

Format as a bullet list with exactly 9 bullets - one for each life event below. Each bullet should mention the age and add one colorful detail.

LIFE EVENTS (write one bullet for each):
${lifeEventsDescription}

Output format - exactly 9 bullets like this:
• Age 18: [colorful description of what happened]
• Age 24: [colorful description of what happened]
...and so on for all 9 events.

No introductory text. Just the 9 bullets. No dollar amounts.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 400,
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
