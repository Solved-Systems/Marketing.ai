'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings, User, Bell, Key, Palette } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono mb-2">
          <span>$</span>
          <span className="text-primary">./config</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Manage your account and application preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <User className="h-4 w-4 text-primary" />
              profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-mono text-sm">
                  display_name
                </Label>
                <Input id="name" placeholder="Your name" className="font-mono" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-mono text-sm">
                  email
                </Label>
                <Input id="email" type="email" placeholder="you@example.com" className="font-mono" />
              </div>
            </div>
            <Button variant="terminal" size="sm">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Bell className="h-4 w-4 text-primary" />
              notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-sm">email_notifications</p>
                <p className="text-xs text-muted-foreground">Receive updates via email</p>
              </div>
              <Button variant="outline" size="sm" className="font-mono">
                Enabled
              </Button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-sm">content_alerts</p>
                <p className="text-xs text-muted-foreground">Get notified when content is generated</p>
              </div>
              <Button variant="outline" size="sm" className="font-mono">
                Enabled
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Key className="h-4 w-4 text-primary" />
              api_keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai" className="font-mono text-sm">
                openai_key
              </Label>
              <Input id="openai" type="password" placeholder="sk-..." className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic" className="font-mono text-sm">
                anthropic_key
              </Label>
              <Input id="anthropic" type="password" placeholder="sk-ant-..." className="font-mono" />
            </div>
            <Button variant="terminal" size="sm">
              Save API Keys
            </Button>
          </CardContent>
        </Card>

        {/* Theme Settings */}
        <Card className="terminal-border bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-sm">
              <Palette className="h-4 w-4 text-primary" />
              appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-mono text-sm">theme</p>
                <p className="text-xs text-muted-foreground">Terminal dark mode</p>
              </div>
              <Button variant="outline" size="sm" className="font-mono" disabled>
                Dark
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
