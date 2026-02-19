import { PrismaClient, UserRole, DeviceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashpassword = bcrypt.hash("password123", 17);
  // Create basic users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      phone: '+1234567890',
      password: `${hashpassword}` ,
      role: UserRole.ADMIN,
      email: 'admin@tekana.com',
    },
  });

  const responder = await prisma.user.create({
    data: {
      name: 'Responder User',
      phone: '+1234567891',
      role: UserRole.COMMUNITY_RESPONDER,
      password: `${hashpassword}` ,
      email: 'responder@tekana.com',
    },
  });

  const citizen = await prisma.user.create({
    data: {
      name: 'Citizen User',
      phone: '+1234567892',
      role: UserRole.CITIZEN,
      password: `${hashpassword}` ,
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
  await prisma.deviceToken.create({
    data: {
      userId: citizen.id,
      token: 'sample-device-token',
      deviceType: DeviceType.ANDROID,
      isActive: true,
    },
  });

  console.log('Basic data seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
