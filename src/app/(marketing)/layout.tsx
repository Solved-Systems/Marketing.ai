export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="scanlines fixed inset-0 pointer-events-none" />
      {children}
    </div>
  )
}
