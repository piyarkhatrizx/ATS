import { z } from "zod";

export const caregiverApplicationSchema = z.object({
  isAtLeast18: z.boolean(),
  isCpaCertified: z.boolean().nullable(),
  patientUsesMedicare: z.boolean(),
  caregivingInterest: z.enum(["GENERAL_CAREGIVER", "CURRENTLY_CARING_FOR_PATIENT"]),
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  email: z.string().trim().email("Enter a valid email address").max(254),
});

export type CaregiverApplicationInput = z.infer<typeof caregiverApplicationSchema>;