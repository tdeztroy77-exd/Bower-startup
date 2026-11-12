export const BRAND = {
  product: "Bower",
  company: "Bower",
  legalName: "Bower",
  creator: "Brian Kiarie",
  domain: "bower.africa",
  siteUrl: "https://bower.africa",
  tagline: "A quieter way to run rentals.",
  description:
    "Bower is the property workspace for landlords and agencies in Africa — rent, tenants, leases, maintenance, documents and reporting in one calm place.",
  supportEmail: "bknglabs.dev@gmail.com",
  supportPhone: "0758034649",
  supportPhoneHref: "tel:+254758034649",
} as const

export function supportMailto(subject: string, body: string) {
  return `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
