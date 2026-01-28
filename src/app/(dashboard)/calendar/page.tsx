import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, Video, Image as ImageIcon, FileText, Clock, Send, Edit } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'
import Link from 'next/link'

const contentTypeIcons = {
  video: Video,
  image: ImageIcon,
  post: FileText,
}

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-blue-500/20 text-blue-500',
  scheduled: 'bg-yellow-500/20 text-yellow-500',
  published: 'bg-green-500/20 text-green-500',
}

export default async function CalendarPage() {
  const supabase = await createClient()

  // Get current month's content
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const { data: content } = await supabase
    .from('content_drafts')
    .select(`
      *,
      brands(name, logo_url, brand_colors)
    `)
    .gte('scheduled_for', monthStart.toISOString())
    .lte('scheduled_for', monthEnd.toISOString())
    .order('scheduled_for')

  // Get upcoming scheduled content
  const { data: upcomingContent } = await supabase
    .from('content_drafts')
    .select(`
      *,
      brands(name, logo_url, brand_colors)
    `)
    .eq('status', 'scheduled')
    .gte('scheduled_for', now.toISOString())
    .order('scheduled_for')
    .limit(10)

  // Get all drafts
  const { data: drafts } = await supabase
    .from('content_drafts')
    .select(`
      *,
      brands(name, logo_url, brand_colors)
    `)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(10)

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getContentForDay = (day: Date) => {
    return content?.filter(c => c.scheduled_for && isSameDay(new Date(c.scheduled_for), day)) || []
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="text-sm text-muted-foreground font-mono mb-2">
          <span className="text-primary">$</span> cat ./calendar
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          <span className="text-primary">{'//'}</span> CONTENT_CALENDAR
        </h2>
        <p className="text-muted-foreground text-sm">
          View and manage scheduled content
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-sm flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(now, 'MMMM yyyy')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground font-mono py-2">
                    {day}
                  </div>
                ))}

                {/* Empty cells for days before month start */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Calendar days */}
                {days.map((day) => {
                  const dayContent = getContentForDay(day)
                  const isCurrentDay = isToday(day)

                  return (
                    <div
                      key={day.toISOString()}
                      className={`aspect-square p-1 border rounded-md ${
                        isCurrentDay
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`text-xs font-mono ${isCurrentDay ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 mt-1">
                        {dayContent.slice(0, 3).map((item) => {
                          const Icon = contentTypeIcons[item.content_type as keyof typeof contentTypeIcons]
                          return (
                            <div
                              key={item.id}
                              className="flex items-center text-[10px] truncate"
                              title={item.title || 'Untitled'}
                            >
                              <Icon className="h-2 w-2 mr-0.5 text-primary flex-shrink-0" />
                              <span className="truncate">{item.title?.substring(0, 10) || 'Untitled'}</span>
                            </div>
                          )
                        })}
                        {dayContent.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{dayContent.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Scheduled */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center">
                <Clock className="mr-2 h-4 w-4 text-yellow-500" />
                SCHEDULED
              </CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Upcoming content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingContent && upcomingContent.length > 0 ? (
                <div className="space-y-3">
                  {upcomingContent.map((item) => {
                    const Icon = contentTypeIcons[item.content_type as keyof typeof contentTypeIcons]
                    const brand = item.brands as { name: string; logo_url: string | null; brand_colors: { primary?: string } | null } | null
                    return (
                      <div key={item.id} className="flex items-start space-x-3 text-sm">
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs truncate">{item.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.scheduled_for && format(new Date(item.scheduled_for), 'MMM d, HH:mm')}
                          </p>
                          {brand && (
                            <p className="text-xs text-primary truncate">{brand.name}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scheduled content
                </p>
              )}
            </CardContent>
          </Card>

          {/* Drafts */}
          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm flex items-center">
                <Edit className="mr-2 h-4 w-4" />
                DRAFTS
              </CardTitle>
              <CardDescription>
                <span className="text-primary">{'//'}</span> Content in progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {drafts && drafts.length > 0 ? (
                <div className="space-y-3">
                  {drafts.map((item) => {
                    const Icon = contentTypeIcons[item.content_type as keyof typeof contentTypeIcons]
                    const brand = item.brands as { name: string; logo_url: string | null; brand_colors: { primary?: string } | null } | null
                    return (
                      <div key={item.id} className="flex items-start space-x-3 text-sm">
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs truncate">{item.title || 'Untitled'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(item.created_at), 'MMM d')}
                          </p>
                          {brand && (
                            <Link href={`/brands/${item.brand_id}`} className="text-xs text-primary truncate hover:underline">
                              {brand.name}
                            </Link>
                          )}
                        </div>
                        <Badge className={statusColors[item.status as keyof typeof statusColors]} variant="outline">
                          {item.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No drafts
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
