'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, MessageSquare, Palette, FileText, Target, CheckCircle, XCircle } from 'lucide-react'
import type { Tables } from '@/lib/database.types'
import type {
  BrandIdentity,
  TargetAudience,
  VoiceAndTone,
  VisualStyle,
  ContentGuidelines,
  CompetitiveContext,
} from '@/lib/style-guide.types'

interface StyleGuidePreviewProps {
  styleGuide: Tables<'style_guides'>
}

export function StyleGuidePreview({ styleGuide }: StyleGuidePreviewProps) {
  const brandIdentity = styleGuide.brand_identity as BrandIdentity
  const targetAudience = styleGuide.target_audience as TargetAudience
  const voiceAndTone = styleGuide.voice_and_tone as VoiceAndTone
  const visualStyle = styleGuide.visual_style as VisualStyle
  const contentGuidelines = styleGuide.content_guidelines as ContentGuidelines
  const competitiveContext = styleGuide.competitive_context as CompetitiveContext

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">BRAND_IDENTITY</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {brandIdentity.tagline && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">TAGLINE</p>
              <p className="text-lg font-semibold italic">"{brandIdentity.tagline}"</p>
            </div>
          )}

          {brandIdentity.mission && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">MISSION</p>
              <p className="text-sm">{brandIdentity.mission}</p>
            </div>
          )}

          {brandIdentity.vision && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">VISION</p>
              <p className="text-sm">{brandIdentity.vision}</p>
            </div>
          )}

          {brandIdentity.elevator_pitch && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">ELEVATOR_PITCH</p>
              <p className="text-sm">{brandIdentity.elevator_pitch}</p>
            </div>
          )}

          {brandIdentity.values && brandIdentity.values.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">CORE_VALUES</p>
              <div className="flex flex-wrap gap-2">
                {brandIdentity.values.map((value, i) => (
                  <Badge key={i} variant="secondary">{value}</Badge>
                ))}
              </div>
            </div>
          )}

          {brandIdentity.brand_story && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">BRAND_STORY</p>
              <p className="text-sm whitespace-pre-wrap">{brandIdentity.brand_story}</p>
            </div>
          )}

          {!brandIdentity.mission && !brandIdentity.vision && !brandIdentity.tagline && (
            <p className="text-sm text-muted-foreground italic">No brand identity defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">TARGET_AUDIENCE</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {targetAudience.demographics && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">DEMOGRAPHICS</p>
              <p className="text-sm">{targetAudience.demographics}</p>
            </div>
          )}

          {targetAudience.industries && targetAudience.industries.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">INDUSTRIES</p>
              <div className="flex flex-wrap gap-2">
                {targetAudience.industries.map((industry, i) => (
                  <Badge key={i} variant="outline">{industry}</Badge>
                ))}
              </div>
            </div>
          )}

          {targetAudience.company_sizes && targetAudience.company_sizes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">COMPANY_SIZES</p>
              <div className="flex flex-wrap gap-2">
                {targetAudience.company_sizes.map((size, i) => (
                  <Badge key={i} variant="outline">{size}</Badge>
                ))}
              </div>
            </div>
          )}

          {targetAudience.pain_points && targetAudience.pain_points.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">PAIN_POINTS</p>
              <ul className="list-disc list-inside space-y-1">
                {targetAudience.pain_points.map((point, i) => (
                  <li key={i} className="text-sm">{point}</li>
                ))}
              </ul>
            </div>
          )}

          {targetAudience.motivations && targetAudience.motivations.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">MOTIVATIONS</p>
              <ul className="list-disc list-inside space-y-1">
                {targetAudience.motivations.map((motivation, i) => (
                  <li key={i} className="text-sm">{motivation}</li>
                ))}
              </ul>
            </div>
          )}

          {!targetAudience.demographics && (!targetAudience.pain_points || targetAudience.pain_points.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No target audience defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Voice & Tone */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">VOICE_AND_TONE</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {voiceAndTone.voice_attributes && voiceAndTone.voice_attributes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">VOICE_ATTRIBUTES</p>
              <div className="flex flex-wrap gap-2">
                {voiceAndTone.voice_attributes.map((attr, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary">{attr}</Badge>
                ))}
              </div>
            </div>
          )}

          {voiceAndTone.writing_style && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">WRITING_STYLE</p>
              <p className="text-sm">{voiceAndTone.writing_style}</p>
            </div>
          )}

          {voiceAndTone.tone_guidelines && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">TONE_GUIDELINES</p>
              <p className="text-sm whitespace-pre-wrap">{voiceAndTone.tone_guidelines}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {voiceAndTone.dos && voiceAndTone.dos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-2 flex items-center">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                  DO
                </p>
                <ul className="space-y-1">
                  {voiceAndTone.dos.map((item, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="text-green-500 mr-2">+</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {voiceAndTone.donts && voiceAndTone.donts.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-2 flex items-center">
                  <XCircle className="h-3 w-3 mr-1 text-red-500" />
                  DON'T
                </p>
                <ul className="space-y-1">
                  {voiceAndTone.donts.map((item, i) => (
                    <li key={i} className="text-sm flex items-start">
                      <span className="text-red-500 mr-2">-</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {voiceAndTone.example_phrases && voiceAndTone.example_phrases.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">EXAMPLE_PHRASES</p>
              <div className="space-y-2">
                {voiceAndTone.example_phrases.map((phrase, i) => (
                  <p key={i} className="text-sm italic border-l-2 border-primary pl-3">"{phrase}"</p>
                ))}
              </div>
            </div>
          )}

          {(!voiceAndTone.voice_attributes || voiceAndTone.voice_attributes.length === 0) && !voiceAndTone.tone_guidelines && (
            <p className="text-sm text-muted-foreground italic">No voice and tone guidelines defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Visual Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">VISUAL_STYLE</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {visualStyle.colors && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">COLOR_PALETTE</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(visualStyle.colors).map(([name, color]) => (
                  color && (
                    <div key={name} className="flex items-center space-x-2">
                      <div
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <p className="text-xs text-muted-foreground capitalize">{name}</p>
                        <p className="text-xs font-mono">{color}</p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {visualStyle.typography && (visualStyle.typography.heading_font || visualStyle.typography.body_font) && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">TYPOGRAPHY</p>
              <div className="grid md:grid-cols-2 gap-4">
                {visualStyle.typography.heading_font && (
                  <div>
                    <p className="text-xs text-muted-foreground">Headings</p>
                    <p className="text-sm" style={{ fontFamily: visualStyle.typography.heading_font }}>
                      {visualStyle.typography.heading_font}
                    </p>
                  </div>
                )}
                {visualStyle.typography.body_font && (
                  <div>
                    <p className="text-xs text-muted-foreground">Body</p>
                    <p className="text-sm" style={{ fontFamily: visualStyle.typography.body_font }}>
                      {visualStyle.typography.body_font}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {visualStyle.image_style && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">IMAGE_STYLE</p>
              <p className="text-sm">{visualStyle.image_style}</p>
            </div>
          )}

          {visualStyle.mood_keywords && visualStyle.mood_keywords.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">MOOD_KEYWORDS</p>
              <div className="flex flex-wrap gap-2">
                {visualStyle.mood_keywords.map((keyword, i) => (
                  <Badge key={i} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>
          )}

          {visualStyle.logo_guidelines && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">LOGO_GUIDELINES</p>
              <p className="text-sm whitespace-pre-wrap">{visualStyle.logo_guidelines}</p>
            </div>
          )}

          {!visualStyle.colors && !visualStyle.image_style && (
            <p className="text-sm text-muted-foreground italic">No visual style defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Content Guidelines */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">CONTENT_GUIDELINES</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentGuidelines.messaging_pillars && contentGuidelines.messaging_pillars.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">MESSAGING_PILLARS</p>
              <div className="flex flex-wrap gap-2">
                {contentGuidelines.messaging_pillars.map((pillar, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary">{pillar}</Badge>
                ))}
              </div>
            </div>
          )}

          {contentGuidelines.key_themes && contentGuidelines.key_themes.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">KEY_THEMES</p>
              <div className="flex flex-wrap gap-2">
                {contentGuidelines.key_themes.map((theme, i) => (
                  <Badge key={i} variant="outline">{theme}</Badge>
                ))}
              </div>
            </div>
          )}

          {contentGuidelines.content_types && contentGuidelines.content_types.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">CONTENT_TYPES</p>
              <div className="flex flex-wrap gap-2">
                {contentGuidelines.content_types.map((type, i) => (
                  <Badge key={i} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>
          )}

          {contentGuidelines.topics_to_avoid && contentGuidelines.topics_to_avoid.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">TOPICS_TO_AVOID</p>
              <ul className="space-y-1">
                {contentGuidelines.topics_to_avoid.map((topic, i) => (
                  <li key={i} className="text-sm flex items-start">
                    <span className="text-red-500 mr-2">x</span>
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {contentGuidelines.call_to_actions && contentGuidelines.call_to_actions.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">CALL_TO_ACTIONS</p>
              <div className="flex flex-wrap gap-2">
                {contentGuidelines.call_to_actions.map((cta, i) => (
                  <Badge key={i} variant="outline">{cta}</Badge>
                ))}
              </div>
            </div>
          )}

          {contentGuidelines.hashtag_strategy && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">HASHTAG_STRATEGY</p>
              <p className="text-sm whitespace-pre-wrap">{contentGuidelines.hashtag_strategy}</p>
            </div>
          )}

          {contentGuidelines.posting_frequency && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">POSTING_FREQUENCY</p>
              <p className="text-sm whitespace-pre-wrap">{contentGuidelines.posting_frequency}</p>
            </div>
          )}

          {(!contentGuidelines.messaging_pillars || contentGuidelines.messaging_pillars.length === 0) &&
           (!contentGuidelines.key_themes || contentGuidelines.key_themes.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No content guidelines defined yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Competitive Context */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="font-mono text-sm">COMPETITIVE_CONTEXT</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {competitiveContext.unique_value_proposition && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">UNIQUE_VALUE_PROPOSITION</p>
              <p className="text-sm font-semibold">{competitiveContext.unique_value_proposition}</p>
            </div>
          )}

          {competitiveContext.market_position && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">MARKET_POSITION</p>
              <p className="text-sm">{competitiveContext.market_position}</p>
            </div>
          )}

          {competitiveContext.positioning && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">POSITIONING</p>
              <p className="text-sm whitespace-pre-wrap">{competitiveContext.positioning}</p>
            </div>
          )}

          {competitiveContext.differentiators && competitiveContext.differentiators.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">DIFFERENTIATORS</p>
              <ul className="space-y-1">
                {competitiveContext.differentiators.map((diff, i) => (
                  <li key={i} className="text-sm flex items-start">
                    <span className="text-primary mr-2">*</span>
                    {diff}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {competitiveContext.competitors && competitiveContext.competitors.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">COMPETITORS</p>
              <div className="grid md:grid-cols-2 gap-3">
                {competitiveContext.competitors.map((competitor, i) => (
                  <div key={i} className="border rounded p-3">
                    <p className="font-medium">{competitor.name}</p>
                    {competitor.website && (
                      <p className="text-xs text-muted-foreground">{competitor.website}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!competitiveContext.positioning && (!competitiveContext.differentiators || competitiveContext.differentiators.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No competitive context defined yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
