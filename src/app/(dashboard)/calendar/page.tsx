'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CalendarPage() {
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./calendar</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Content Calendar</h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Schedule and manage your content publishing
            </p>
          </div>
          <Button variant="terminal" className="self-start sm:self-auto w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Schedule Content
          </Button>
        </div>
      </div>

      {/* Calendar Placeholder */}
      <Card className="terminal-border bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-mono text-sm">
            <Calendar className="h-4 w-4 text-primary" />
            schedule_view
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="font-mono text-lg mb-2">No scheduled content</h3>
            <p className="text-muted-foreground text-sm max-w-md">
              Schedule your generated content to be published automatically.
              Connect your social accounts in integrations to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
