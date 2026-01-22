import { prisma } from "../prisma";

const main = async () => {
    console.log("Resetting all bookings...");

    // 1. Delete all bookings
    await prisma.booking.deleteMany({});

    console.log("Successfully deleted all bookings. Seats are now effectively available.");
};

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });