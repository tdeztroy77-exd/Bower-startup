import { withAuth, successResponse } from "@/lib/api"
import { darajaConfig, darajaConfigIssues, darajaConfigured, darajaMockMode } from "@/lib/mpesa/daraja"
import { billingConfigured } from "@/lib/billing/server"

/**
 * GET /api/mpesa/readiness
 *
 * Authenticated readiness check for the billing screen. Reports whether the
 * M-Pesa production rail is wired correctly without exposing credentials,
 * the shortcode or the callback secret.
 */
export const GET = withAuth(async () => {
  const cfg = darajaConfig()
  let callbackHost: string | null = null
  try {
    callbackHost = cfg.callbackUrl ? new URL(cfg.callbackUrl).host : null
  } catch {
    callbackHost = null
  }

  return successResponse({
    mpesa: {
      environment: cfg.env,
      sandbox: cfg.sandbox,
      configured: darajaConfigured(),
      mock_active: darajaMockMode(),
      shortcode_type: cfg.shortcodeType,
      callback_host: callbackHost,
      callback_https: /^https:\/\//i.test(cfg.callbackUrl),
      issues: darajaConfigIssues(),
    },
    stripe: {
      configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    },
    billing_database: billingConfigured(),
  })
})
