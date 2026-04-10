import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Returns the parsed data or a NextResponse with 400 error.
 */
export async function parseBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return NextResponse.json(
      { error: firstError?.message || "Datos invalidos" },
      { status: 400 },
    );
  }

  return result.data;
}

// ─── Shared schemas ──────────────────────────────────────────────────────────

export const emailSchema = z.string().min(1, "Email requerido").max(255);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Contrasena requerida"),
});

export const signupSchema = z.object({
  name: z.string().max(100).optional(),
  email: emailSchema,
  phone: z.string().max(20).optional(),
  password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres"),
  utm: z.record(z.string(), z.string()).optional(),
  orgInviteCode: z.string().optional(),
});

export const checkinSchema = z.object({
  response: z.string().min(1).max(5000),
  mood: z.string().max(50).optional(),
  energyLevel: z.number().min(0).max(10).optional(),
});

export const feedbackSchema = z.object({
  type: z.enum(["suggestion", "bug", "other", "nps"]).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  message: z.string().max(2000).optional(),
  page: z.string().max(200).optional(),
});
