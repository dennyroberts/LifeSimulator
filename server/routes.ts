import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post("/api/generate-biography", async (req, res) => {
    try {
      const { name, traits, stages, careerName } = req.body;

      if (!traits || !stages) {
        return res
          .status(400)
          .json({ error: "Missing required simulation data" });
      }

      const lifeEventsDescription = stages
        .map((stage: any) => {
          const age = stage.age;
          let eventType = "";
          let eventName = "";
          let outcome = "";
          let success = true;

          if (stage.education) {
            eventType = "Education";
            eventName = stage.education.label;
            outcome = stage.education.outcomeMessage || "";
          } else if (stage.career) {
            eventType = "Career Placement";
            eventName = stage.career.career?.name || "Unknown";
            outcome = stage.career.outcomeMessage || "";
            success = true;
          } else if (stage.event) {
            eventType = "Life Event";
            eventName = stage.event.event?.name || "Unknown";
            outcome = stage.event.outcomeMessage || "";
            success = stage.event.success ?? true;
          }

          return `Age ${age}: [${eventType}] ${eventName} - ${success ? "Success" : "Failure"}. ${outcome}`;
        })
        .join("\n");

      const traitsList = [
        { name: "Intelligence", value: traits.INT },
        { name: "Work Ethic", value: traits.WORK },
        { name: "Connections", value: traits.NEPO },
        { name: "Charisma", value: traits.CHAR },
        { name: "Risk Tolerance", value: traits.RISK },
      ];
      const sortedTraits = [...traitsList].sort((a, b) => b.value - a.value);
      const highestTrait = sortedTraits[0];
      const lowestTrait = sortedTraits[sortedTraits.length - 1];

      console.log("Life events being sent to OpenAI:", lifeEventsDescription);

      const prompt = `Based only on the information provided, write a short, wry, biography for a person. I will give you their name, traits (intelligence, charisma, risk tolerance, work ethic, and "nepotism" which is proxy for family wealth/connections), career field, and 9 life events to work from. The life events contain a title (what happened), and a success/failure/did not try note, plus a brief plain-text description of how the event resolved (sometimes events are resolved based on the traits - like "due you your intelligence..."). The biography should be witty but not try too hard. The bio should be solely based on the information provided plus some embellishment (like if they work in Finance, you can make up the name of the company they work for), and should mention every single life event and the age it happened at, in order. 
      Name: ${name}
      Career field: ${careerName}
      Traits: ${sortedTraits}

LIFE EVENTS:
${lifeEventsDescription}

The output should be concise while still hitting all the points mentioned. The first sentence should summarize their traits, noting any above average or below average (traits are scored 1-20). Then the remaining sentences should cover the life events, in order, and adding color and embellishment when appropriate (if a life event says they were sued, invent what the lawsuit was about; if it says they went to an elite college, choose a real-world elite college to mention).

Other rules: No dollar amounts. Write in past tense.

EXAMPLE OUTPUT:
Marcus Chen was a brilliant student from a wealthy family, but never much of a ri. At 18, his early academic success landed him a spot at Yale University, where he studied Computer Science. By 24, thanks to family connections, he had began a successful career at an AI lab, designing autonomous nerve agent delivery systems for use against protesters, and quickly rose through the ranks, being promoted to a senior role at age 30. 

At 36 he briefly toyed with the idea of getting his masters, but decided it wasn't worth leaving the workforce. At 42, after years of stagnation, Marcus left his role to found a company designing high energy low-earth-orbit weapons, which ultimately flopped. Redoubling his efforts at work, he rose to senior leadership with another promotion in his late 40s. At 54, he passed up an opportunity to invest in an early-stage riotbot startup, which eventually went unicorn, a decision he regretted for the rest of his life.

At 60, he decided weapons-grade robotics was no longer for him, and became a painter. He tried to retire early, at 66, but ultimately decided not to take the chance.`;

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

      const biography =
        response.choices[0]?.message?.content || "No biography generated.";

      res.json({ biography });
    } catch (error: any) {
      console.error("Error generating biography:", error);
      res.status(500).json({ error: "Failed to generate biography" });
    }
  });

  return httpServer;
}
