import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin',
      role: Role.ADMIN,
    },
  });

  // Seed Regular Users
  const userPassword = await bcrypt.hash('user123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'ahmed@example.com' },
    update: {},
    create: {
      email: 'ahmed@example.com',
      password: userPassword,
      name: 'Ahmed',
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'sara@example.com' },
    update: {},
    create: {
      email: 'sara@example.com',
      password: userPassword,
      name: 'Sara',
      role: Role.USER,
    },
  });

  // Seed Categories
  const tech = await prisma.category.create({ data: { name: 'Technology' } });
  const science = await prisma.category.create({ data: { name: 'Science' } });
  const sports = await prisma.category.create({ data: { name: 'Sports' } });

  // Seed Posts
  await prisma.post.createMany({
    skipDuplicates: true,
    data: [
      { name: 'First Post', user_id: admin.id },
      { name: 'Second Post', user_id: user1.id },
      { name: 'Third Post', user_id: user2.id },
    ],
  });

  console.log('✅ Seed completed');
  console.log({ admin, user1, user2 });
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
