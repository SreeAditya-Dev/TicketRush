import express from "express";
import { prisma } from "../prisma";
import { EVENTS_SEED } from "../data/eventsSeed";

export const eventsRouter = express.Router();

eventsRouter.get("/events", async (_req, res) => {
  try {
    const eventModel = (prisma as any).event;
    if (!eventModel) {
      // Fallback if prisma generate hasn't been restarted yet after schema update
      return res.json({ events: EVENTS_SEED });
    }
    
    const count = await eventModel.count();
    if (count === 0) {
      await eventModel.createMany({
        data: EVENTS_SEED,
        skipDuplicates: true
      });
      console.log("Auto-seeded events table in database.");
    }

    const events = await eventModel.findMany();
    res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.json({ events: EVENTS_SEED });
  }
});

eventsRouter.get("/events/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const eventModel = (prisma as any).event;
    if (!eventModel) {
      const found = EVENTS_SEED.find(e => e.id === id) || null;
      return res.json({ event: found });
    }

    const event = await eventModel.findUnique({
      where: { id }
    });
    res.json({ event });
  } catch (error) {
    console.error("Error fetching event by id:", error);
    const found = EVENTS_SEED.find(e => e.id === id) || null;
    res.json({ event: found });
  }
});
