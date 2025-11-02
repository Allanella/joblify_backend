// test-prisma.mjs
import prisma from './lib/prisma.mjs';

async function testPrisma() {
  try {
    console.log('Testing Prisma connection...');
    await prisma.$connect();
    console.log('✅ Prisma connected successfully');
    
    const users = await prisma.user.findMany();
    console.log(`✅ Found ${users.length} users`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Prisma test failed:', error);
  }
}

testPrisma();