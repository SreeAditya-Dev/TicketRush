import { prisma } from "../prisma";
import { EVENTS_SEED } from "../data/eventsSeed";

const buildSeatCodes = (count: number): string[] =>
  Array.from({ length: count }, (_value, index) => `S${String(index + 1).padStart(3, "0")}`);

const main = async () => {
  const seatCodes = buildSeatCodes(100);

  await prisma.seat.createMany({
    data: seatCodes.map((code) => ({ code })),
    skipDuplicates: true
  });
  console.log(`Seeded ${seatCodes.length} seats (skipDuplicates applied).`);

  if ((prisma as any).event) {
    await (prisma as any).event.createMany({
      data: EVENTS_SEED,
      skipDuplicates: true
    });
    console.log(`Seeded ${EVENTS_SEED.length} events (skipDuplicates applied).`);
  }
};

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
