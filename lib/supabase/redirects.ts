const PRODUCTION_APP_FALLBACK = "https://app.bower.africa"

function isProductionDeployment() {
  return (
    process.env.VERCEL_ENV === "production" ||
    (process.env.NODE_ENV === "production" && !process.env.VERCEL_ENV)
  )
}

function getConfiguredOrigin(value: string | undefined) {
  if (!value) return null

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`)
    if (url.protocol !== "https:" && url.hostname !== "localhost") return null
    if (isProductionDeployment() && url.hostname === "localhost") return null
    return url.origin
  } catch {
    return null
  }
}

export function getApplicationOrigin() {
  const configuredOrigin = getConfiguredOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (configuredOrigin) return configuredOrigin

  if (isProductionDeployment()) {
    const productionOrigin = getConfiguredOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return productionOrigin ?? PRODUCTION_APP_FALLBACK
  }

  const deploymentOrigin = getConfiguredOrigin(process.env.VERCEL_URL)
  if (deploymentOrigin) return deploymentOrigin

  const devRedirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  if (devRedirect) {
    try {
      return new URL(devRedirect).origin
    } catch {
      // Fall through to the local development origin.
    }
  }

  return "http://localhost:3000"
}

export function getSignupEmailRedirectTo() {
  const devRedirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
  const isProduction = isProductionDeployment()

  if (!isProduction && devRedirect) return devRedirect

  const callback = new URL("/auth/callback", getApplicationOrigin())
  callback.searchParams.set("next", "/dashboard")
  return callback.toString()
}

export function getPasswordRecoveryRedirectTo() {
  const devRedirect = process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL

  if (!isProductionDeployment() && devRedirect) {
    try {
      const recovery = new URL(devRedirect)
      recovery.pathname = "/auth/reset-password"
      recovery.search = ""
      recovery.hash = ""
      return recovery.toString()
    } catch {
      // Fall through to the configured app origin.
    }
  }

  return new URL("/auth/reset-password", getApplicationOrigin()).toString()
}
