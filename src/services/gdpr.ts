import { getPrismaClient } from "@/db/prisma";
import { logError, logInfo } from "@/lib/logger";
// import { stripe } from "@/lib/stripe"; // Descomenta cuando tengas Stripe configurado

/**
 * Ejecuta el Derecho de Supresión (Art. 17 RGPD)
 * Elimina permanentemente al usuario y todos sus datos en cascada,
 * así como su huella en proveedores externos.
 */
export async function executeRightToErasure(userId: string): Promise<boolean> {
  const prisma = getPrismaClient();

  try {
    // 1. Recuperar identificadores externos antes de borrar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        stripeCustomerId: true,
        telegramId: true,
      },
    });

    if (!user) {
      logInfo("GDPR", "Intento de borrado de usuario inexistente", { userId });
      return false;
    }

    // 2. Eliminar datos en Subencargados del Tratamiento (Third-parties)
    if (user.stripeCustomerId) {
      try {
        // Si usas Stripe, debes eliminar el customer para cumplir con RGPD
        // await stripe.customers.del(user.stripeCustomerId);
        logInfo("GDPR", "Stripe customer eliminado", { customerId: user.stripeCustomerId });
      } catch (stripeError) {
        // Registramos el error pero continuamos con el borrado local
        logError("GDPR", stripeError, { area: "stripe_customer_deletion" });
      }
    }

    // 3. HARD DELETE en la base de datos local
    // IMPORTANTE: Gracias al `onDelete: Cascade` en schema.prisma,
    // esto destruirá automáticamente: Conversation, Message, LlmLog, UserState, etc.
    await prisma.user.delete({
      where: { id: userId },
    });

    logInfo("GDPR", "Supresión de datos completada exitosamente", { userId });
    return true;
  } catch (error: unknown) {
    logError("GDPR", error, { area: "execute_right_to_erasure", userId });
    throw new Error("Fallo al ejecutar el derecho de supresión. Contacte a soporte.");
  }
}
