const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function createAdmin() {
  const email = 'admin@liteapp.com';
  const password = 'Admin@12#*';
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: 'ADMIN',
        password: hashedPassword
      },
      create: {
        email,
        name: 'System Admin',
        phone: '8888888888',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log('Admin user created/updated:');
    console.log('Email:', email);
    console.log('Password:', password);
  } catch (err) {
    console.error('Error creating admin:', err);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
