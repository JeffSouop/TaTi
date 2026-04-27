// =============================================================================
// Client serveur "admin" : alias de `dbAdmin` côté serveur (pas de HTTP local).
// L'API publique reste compatible avec l'ancien `supabaseAdmin.from(...)`.
// =============================================================================
import { dbAdmin } from "@/lib/db.server";

export const supabaseAdmin = dbAdmin;
