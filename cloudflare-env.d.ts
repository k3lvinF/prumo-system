declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    HOURS_CONTACT_OWNER?: string;
    HOURS_PERSONAL_EMAIL?: string;
    HOURS_PERSONAL_WHATSAPP?: string;
  }
}
