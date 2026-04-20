## 2024-04-20 - Timing Attack Vulnerability in Secret Validation
**Vulnerability:** API endpoints (`/api/admin/setup-s3`, `/api/cron/*`) were validating `Bearer` tokens against environment secrets using simple string inequality (`token !== secret`), which leaks length and character timing information.
**Learning:** Standard string comparisons stop at the first mismatch. Attackers can measure response times to guess the secret character by character.
**Prevention:** Always use constant-time comparison methods (like `crypto.timingSafeEqual`) for secrets, hashes, or API tokens. A reusable `secureCompare` helper was added to `lib/auth-utils.ts` for this purpose.
