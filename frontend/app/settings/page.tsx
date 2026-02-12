'use client'

import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { User, Lock, Bell, Shield, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground">Manage your profile and security settings</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-border">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'privacy', label: 'Privacy', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input defaultValue="Dr. Sarah Johnson" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input defaultValue="sarah.johnson@example.com" type="email" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Phone Number</label>
                    <Input defaultValue="+1 (555) 123-4567" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Account Type</label>
                    <div className="flex items-center h-10 px-3 bg-muted rounded border border-border">
                      <Badge className="bg-primary text-primary-foreground">Customer</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <Input defaultValue="123 Main St, New York, NY 10001" />
                </div>

                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button>Save Changes</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </Card>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Password</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Current Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">New Password</label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Confirm New Password</label>
                    <Input type="password" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button>Update Password</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </Card>

              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Two-Factor Authentication</h2>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded border border-border">
                  <div>
                    <p className="font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                  </div>
                  <Button variant="outline">Enable</Button>
                </div>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>

                {[
                  { title: 'Product Alerts', description: 'Receive alerts when verification status changes' },
                  { title: 'Email Notifications', description: 'Get email updates about your account' },
                  { title: 'Blockchain Updates', description: 'Notifications about new blockchain transactions' },
                  { title: 'Security Alerts', description: 'Alert me about suspicious account activity' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 rounded border-primary" defaultChecked />
                  </div>
                ))}

                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button>Save Preferences</Button>
                  <Button variant="outline">Cancel</Button>
                </div>
              </Card>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <Card className="p-6 border border-border space-y-6">
                <h2 className="text-lg font-semibold text-foreground">Privacy Settings</h2>

                {[
                  { title: 'Profile Visibility', description: 'Control who can see your profile information' },
                  { title: 'Activity Log', description: 'View your account activity history' },
                  { title: 'Data Download', description: 'Download all your data in a portable format' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-border rounded">
                    <div>
                      <p className="font-medium text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Button size="sm" variant="outline">
                      Manage
                    </Button>
                  </div>
                ))}

                <div className="space-y-4 pt-4 border-t border-border">
                  <h3 className="font-semibold text-foreground">Danger Zone</h3>
                  <Button variant="destructive" className="w-full gap-2">
                    <LogOut className="h-4 w-4" />
                    Delete Account
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
