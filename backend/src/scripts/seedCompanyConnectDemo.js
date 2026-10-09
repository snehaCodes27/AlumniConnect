require('dotenv').config();
const prisma=require('../config/prisma');
const bcrypt=require('bcryptjs');
const accounts=[
 {email:'demo.godrej.mentor@example.test',firstName:'Demo',lastName:'Godrej Mentor',role:'ALUMNI',profile:{currentCompany:'Godrej',jobRole:'Software Engineer',branch:'Information Technology',graduationYear:2020,yearsOfExperience:6}},
 {email:'demo.eligible.student@example.test',firstName:'Demo',lastName:'Eligible Student',role:'STUDENT',profile:{cgpa:8.2,branch:'Information Technology',currentYear:4}},
 {email:'demo.ineligible.student@example.test',firstName:'Demo',lastName:'Ineligible Student',role:'STUDENT',profile:{cgpa:4.2,branch:'Information Technology',currentYear:4}}
];
async function main(){
 if(process.env.NODE_ENV==='production')throw new Error('Demo setup is only for local development.');
 const passwordHash=await bcrypt.hash('DemoConnect2026!',12);
 await prisma.$transaction(async tx=>{for(const account of accounts){const existing=await tx.user.findUnique({where:{email:account.email}});if(existing&&(existing.firstName!=='Demo'||existing.role!==account.role))throw new Error('Reserved demo email already belongs to another account.');const {profile,...data}=account;const user=existing||await tx.user.create({data:{...data,passwordHash,isApproved:true,isVerified:false}});const model=account.role==='ALUMNI'?'alumniProfile':'studentProfile';await tx[model].upsert({where:{userId:user.id},create:{userId:user.id,...profile},update:profile});}});
 console.log('Local demo profiles ready. Existing non-demo accounts were not changed.');
 console.log('Accounts: '+accounts.map(a=>a.email).join(', '));
 console.log('First-created demo account password: DemoConnect2026!');
 console.log('example.test mailboxes are placeholders. Use dashboard acceptance for the no-email demo; use a real test mailbox and configured SMTP to test inbox delivery.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>prisma.$disconnect());
