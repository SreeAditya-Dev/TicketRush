import { prisma } from "../prisma";

const buildSeatCodes = (count: number): string[] =>
  Array.from({ length: count }, (_value, index) => `S${String(index + 1).padStart(3, "0")}`);

const main = async () => {
  const seatCodes = buildSeatCodes(100);

  await prisma.seat.createMany({
    data: seatCodes.map((code) => ({ code })),
    skipDuplicates: true
  });

  console.log(`Seeded ${seatCodes.length} seats (skipDuplicates applied).`);
};

main()
  .catch((error) => {
    console.error("Seeding failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
