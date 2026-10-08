const { PrismaClient, Role } = require('@prisma/client');

function verifyPrismaClient() {
  console.log('--- AlumniConnect Database & Prisma Verification ---');
  
  // 1. Verify Role enum
  console.log('[1] Role Enum exported:');
  console.log('    STUDENT:', Role.STUDENT);
  console.log('    ALUMNI:', Role.ALUMNI);
  console.log('    ADMIN:', Role.ADMIN);
  
  if (!Role.STUDENT || !Role.ALUMNI || !Role.ADMIN) {
    throw new Error('Role enum missing expected values (STUDENT, ALUMNI, ADMIN)');
  }
  
  // 2. Instantiate Prisma Client & check attached models
  const prisma = new PrismaClient();
  const ownProps = Object.getOwnPropertyNames(prisma);
  
  console.log('\n[2] Checking generated Prisma Client models...');
  
  const expectedModels = ['user', 'studentProfile', 'alumniProfile'];
  let allValid = true;

  expectedModels.forEach(model => {
    if (ownProps.includes(model) && prisma[model]) {
      console.log(`    Model '${model}': GENERATED & ATTACHED ✅`);
    } else {
      console.log(`    Model '${model}': NOT ATTACHED ❌`);
      allValid = false;
    }
  });

  if (allValid) {
    console.log('\n✅ Prisma Client generation successfully verified for all models & enums!');
  } else {
    console.error('\n❌ Prisma Client verification failed.');
    process.exit(1);
  }
}

verifyPrismaClient();
