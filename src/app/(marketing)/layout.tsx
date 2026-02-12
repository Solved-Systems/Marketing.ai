export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background bg-[radial-gradient(60%_45%_at_50%_0%,rgba(255,190,120,0.07),transparent_72%)]">
      {children}
    </div>
  )
}
