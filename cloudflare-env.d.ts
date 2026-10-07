declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PRUMO_BACKUP_TOKEN?: string;
    PRUMO_BACKUP_UNTIL?: string;
    PRUMO_WORKSPACE_OWNER?: string;
    HOURS_CONTACT_OWNER?: string;
    HOURS_PERSONAL_EMAIL?: string;
    HOURS_PERSONAL_WHATSAPP?: string;
  }
}
