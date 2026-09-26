export function appSettings() {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return {
    appUrl,
    bookingLink:
      process.env.BOOKING_LINK || "https://calendly.com/your-team/cyber-career-roadmap-call",
    masterclassLink: process.env.MASTERCLASS_LINK || "https://example.com/masterclass",
    adminNotificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || "",
    senderName: process.env.DEFAULT_SENDER_NAME || "Dr Cyber Team",
    cohortName: process.env.PROGRAM_COHORT_NAME || "Dr Cyber Switch Program",
    smsEnabled: process.env.SMS_ENABLED === "true",
    logoUrl: process.env.LOGO_URL || `${appUrl}/images/logo.jpg`
  };
}
