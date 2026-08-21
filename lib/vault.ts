import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * A cue that fires while the laptop is shut has to be fired by something
 * other than the laptop, and that something needs the key. There is no
 * arrangement where the key stays only in the browser and the queue still
 * runs overnight; the honest move is to hold it as ciphertext and say so.
 *
 * AES-256-GCM. The key comes from VAULT_SECRET, which lives in the Vercel
 * project and never in the repository. Losing that secret makes every stored
 * key unreadable, which is the intended failure direction.
 */
function secret(): Buffer {
  const raw = process.env.VAULT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error("VAULT_SECRET is missing or too short.");
  }
  return createHash("sha256").update(raw).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), body.toString("base64")].join(".");
}

export function open(sealed: string): string {
  const [iv, tag, body] = sealed.split(".");
  if (!iv || !tag || !body) throw new Error("stored key is malformed");
  const d = createDecipheriv("aes-256-gcm", secret(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(body, "base64")), d.final()]).toString("utf8");
}

/** URL-safe handle for a run. Long enough that guessing one is not a strategy. */
export function handle(): string {
  return randomBytes(18).toString("base64url");
}
