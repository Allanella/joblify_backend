import prisma from '../lib/prisma.mjs';

export const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      success: true,
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};