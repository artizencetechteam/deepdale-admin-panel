"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = require("../src/lib/prisma");
const env_1 = require("../src/config/env");
const passwords_1 = require("../src/lib/passwords");
const ids_1 = require("../src/lib/ids");
async function main() {
    const email = env_1.env.ADMIN_SEED_EMAIL.toLowerCase().trim();
    const passwordHash = await (0, passwords_1.hashPassword)(env_1.env.ADMIN_SEED_PASSWORD);
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: {
            email
        }
    });
    if (!existingUser) {
        await prisma_1.prisma.user.create({
            data: {
                id: (0, ids_1.newId)(),
                email,
                name: "Deepdale Super Admin",
                role: "superadmin",
                isActive: true,
                passwordHash
            }
        });
        console.log(`Created superadmin ${email}`);
        return;
    }
    await prisma_1.prisma.user.update({
        where: {
            id: existingUser.id
        },
        data: {
            name: "Deepdale Super Admin",
            role: "superadmin",
            isActive: true,
            passwordHash
        }
    });
    console.log(`Updated superadmin ${email}`);
}
main()
    .then(async () => {
    await prisma_1.prisma.$disconnect();
})
    .catch(async (error) => {
    console.error(error);
    await prisma_1.prisma.$disconnect();
    process.exit(1);
});
