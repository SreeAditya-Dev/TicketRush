import { prisma } from "../prisma";

const main = async () => {
    console.log("Resetting all seats...");

    // 1. Delete all bookings first (foreign key constraint)
    await prisma.booking.deleteMany({});

    // 2. Reset Seat status
    await prisma.seat.updateMany({
        data: {
            isBooked: false,
            bookedAt: null,
        }
    });

    console.log("Successfully reset all seats to AVAILABLE.");
};

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
