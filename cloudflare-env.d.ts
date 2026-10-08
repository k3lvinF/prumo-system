declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PRUMO_BACKUP_TOKEN?: string;
    PRUMO_BACKUP_UNTIL?: string;
    PRUMO_WORKSPACE_OWNER?: string;
    PRUMO_OWNER_EMAIL?: string;
    AUTH_MODE?: string;
    BETTER_AUTH_SECRET?: string;
    BETTER_AUTH_URL?: string;
    RESEND_API_KEY?: string;
    AUTH_EMAIL_FROM?: string;
    HOURS_CONTACT_OWNER?: string;
    HOURS_PERSONAL_EMAIL?: string;
    HOURS_PERSONAL_WHATSAPP?: string;
  }
}
