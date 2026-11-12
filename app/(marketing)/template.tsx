/**
 * Marketing page transition.
 *
 * A short, quiet fade on route change. The workspace does not use this — it
 * stays instant — but the public site should feel like turning a page, not
 * swapping a frame.
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="bower-fade">{children}</div>
}
