import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      id: randomUUID(),
      name: "Admin",
      email,
      passwordHash,
      role: "admin"
    }
  });

  const settings = {
    booking_link: process.env.BOOKING_LINK || "https://calendly.com/your-team/cyber-career-roadmap-call",
    admin_notification_email: process.env.ADMIN_NOTIFICATION_EMAIL || email,
    sms_enabled: process.env.SMS_ENABLED || "false",
    default_sender_name: process.env.DEFAULT_SENDER_NAME || "Dr Cyber Team",
    program_cohort_name: process.env.PROGRAM_COHORT_NAME || "Dr Cyber Switch Program"
  };

  for (const [settingKey, settingValue] of Object.entries(settings)) {
    await prisma.automationSetting.upsert({
      where: { settingKey },
      update: { settingValue },
      create: { id: randomUUID(), settingKey, settingValue }
    });
  }

  await prisma.lead.upsert({
    where: { email: "sample.lead@example.com" },
    update: {},
    create: {
      id: randomUUID(),
      firstName: "Sample",
      lastName: "Lead",
      email: "sample.lead@example.com",
      phone: "+15555550101",
      currentProfession: "Healthcare administrator",
      city: "Calgary",
      country: "Canada",
      startTimeline: "Within 30 days",
      pathwayResult: "Cyber GRC / Risk Pathway",
      pathwayScoreJson: { grc: 17, soc: 5, cloud: 2, pentest: 0, iam: 6, vuln: 2, ai: 4, foundation: 7 },
      source: "seed",
      consent: true,
      tag: "pathway:grc",
      pipelineStages: {
        create: {
          id: randomUUID(),
          stage: "Roadmap Delivered",
          status: "Open",
          notes: "Seed lead for dashboard testing."
        }
      }
    }
  });
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
