import { prisma } from "../src/lib/prisma";
import { env } from "../src/config/env";
import { hashPassword } from "../src/lib/passwords";
import { newId } from "../src/lib/ids";

async function main(): Promise<void> {
  const email = env.ADMIN_SEED_EMAIL.toLowerCase().trim();
  const passwordHash = await hashPassword(env.ADMIN_SEED_PASSWORD);

  const existingUser = await prisma.user.findUnique({
    where: {
      email
    }
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: newId(),
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

  await prisma.user.update({
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
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
