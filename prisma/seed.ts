import { PrismaClient, UserRole, DeviceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashpassword = await bcrypt.hash("admin", 10);
  // Create basic users
  const admin = await prisma.user.upsert({
    where: { phone: '+250788888888' },
    update: {
      password: hashpassword,
      role: UserRole.ADMIN,
      email: 'admin@gmail.com',
    },
    create: {
      name: 'Admin User',
      phone: '+250788888888',
      password: hashpassword,
      role: UserRole.ADMIN,
      email: 'admin@gmail.com',
    },
  });

  const responder = await prisma.user.upsert({
    where: { phone: '+1234567891' },
    update: {
      name: 'Responder User',
      role: UserRole.COMMUNITY_RESPONDER,
      password: hashpassword,
      email: 'responder@tekana.com',
    },
    create: {
      name: 'Responder User',
      phone: '+1234567891',
      role: UserRole.COMMUNITY_RESPONDER,
      password: hashpassword,
      email: 'responder@tekana.com',
    },
  });

  const citizen = await prisma.user.upsert({
    where: { phone: '+1234567892' },
    update: {
      name: 'Citizen User',
      role: UserRole.CITIZEN,
      password: hashpassword,
      email: 'citizen@tekana.com',
    },
    create: {
      name: 'Citizen User',
      phone: '+1234567892',
      role: UserRole.CITIZEN,
      password: hashpassword,
      email: 'citizen@tekana.com',
    },
  });

  // Create responder profile
  // await prisma.responderProfile.create({
  //   data: {
  //     userId: responder.id,
  //     isAvailable: true,
  //     currentLocationLat: -1.9441, // Kigali coordinates
  //     currentLocationLng: 30.0619,
  //     skills: ['emergency_response'],
  //   },
  // });

  // Create device token for citizen
  // await prisma.deviceToken.create({
  //   data: {
  //     userId: citizen.id,
  //     token: 'sample-device-token',
  //     deviceType: DeviceType.ANDROID,
  //     isActive: true,
  //   },
  // });

  console.log('Basic data seeded successfully');

  // Normalize phone numbers for existing users
  const users = await prisma.user.findMany();
  for (const user of users) {
    const normalizedPhone = user.phone.replace(/\s+/g, '');
    if (normalizedPhone !== user.phone) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone: normalizedPhone },
      });
      console.log(`Normalized phone for user ${user.name}: ${user.phone} -> ${normalizedPhone}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
