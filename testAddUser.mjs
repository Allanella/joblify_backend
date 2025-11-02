import prisma from './lib/prisma.mjs';
import bcrypt from 'bcryptjs';

async function main() {
  const hashedPassword = await bcrypt.hash('Password123', 10);

  const newUser = await prisma.appUser.create({
    data: {
      email: 'allan@example.com',
      password: hashedPassword,
      firstName: 'Allan',
      lastName: 'Baliddawa',
      phone: '0712345678',
    },
  });

  console.log('User created:', newUser);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
