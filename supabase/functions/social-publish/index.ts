import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PublishRequest {
  queueId: string
}

// Platform-specific upload handlers
async function publishToLinkedIn(
  accessToken: string,
  videoUrl: string,
  caption: string,
  authorId: string
): Promise<{ postId: string; postUrl: string }> {
  // LinkedIn Video Upload Flow:
  // 1. Initialize upload
  // 2. Upload video chunks
  // 3. Create post with video

  // Initialize upload
  const initResponse = await fetch('https://api.linkedin.com/v2/videos?action=initializeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      initializeUploadRequest: {
        owner: `urn:li:person:${authorId}`,
        fileSizeBytes: 0, // Will be determined during upload
        uploadCaptions: false,
        uploadThumbnail: false,
      },
    }),
  })

  if (!initResponse.ok) {
    throw new Error(`LinkedIn upload init failed: ${await initResponse.text()}`)
  }

  const initData = await initResponse.json()
  const uploadUrl = initData.value?.uploadInstructions?.[0]?.uploadUrl
  const videoUrn = initData.value?.video

  if (!uploadUrl || !videoUrn) {
    throw new Error('Failed to get LinkedIn upload URL')
  }

  // Download video and upload to LinkedIn
  const videoResponse = await fetch(videoUrl)
  const videoBlob = await videoResponse.blob()

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'video/mp4',
    },
    body: videoBlob,
  })

  if (!uploadResponse.ok) {
    throw new Error(`LinkedIn video upload failed: ${await uploadResponse.text()}`)
  }

  // Finalize upload
  await fetch('https://api.linkedin.com/v2/videos?action=finalizeUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      finalizeUploadRequest: {
        video: videoUrn,
        uploadToken: '',
        uploadedPartIds: [],
      },
    }),
  })

  // Create post with video
  const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      author: `urn:li:person:${authorId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: caption,
          },
          shareMediaCategory: 'VIDEO',
          media: [
            {
              status: 'READY',
              media: videoUrn,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  })

  if (!postResponse.ok) {
    throw new Error(`LinkedIn post creation failed: ${await postResponse.text()}`)
  }

  const postData = await postResponse.json()
  const postId = postData.id

  return {
    postId,
    postUrl: `https://www.linkedin.com/feed/update/${postId}`,
  }
}

async function publishToTwitter(
  accessToken: string,
  videoUrl: string,
  caption: string
): Promise<{ postId: string; postUrl: string }> {
  // Twitter v2 API video upload
  // Note: Twitter requires OAuth 1.0a for media upload

  // For demonstration, showing the API structure
  // In production, you'd need proper OAuth 1.0a implementation

  // 1. INIT - Initialize upload
  const initResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      command: 'INIT',
      media_type: 'video/mp4',
      media_category: 'tweet_video',
    }),
  })

  if (!initResponse.ok) {
    throw new Error(`Twitter upload init failed: ${await initResponse.text()}`)
  }

  const initData = await initResponse.json()
  const mediaId = initData.media_id_string

  // 2. APPEND - Upload video chunks (simplified)
  // ... chunked upload logic

  // 3. FINALIZE
  // ... finalize logic

  // 4. Create tweet with media
  const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: caption,
      media: { media_ids: [mediaId] },
    }),
  })

  if (!tweetResponse.ok) {
    throw new Error(`Twitter post failed: ${await tweetResponse.text()}`)
  }

  const tweetData = await tweetResponse.json()

  return {
    postId: tweetData.data.id,
    postUrl: `https://twitter.com/i/status/${tweetData.data.id}`,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { queueId }: PublishRequest = await req.json()

    if (!queueId) {
      throw new Error('Queue ID is required')
    }

    // Fetch the publish queue item
    const { data: queueItem, error: queueError } = await supabase
      .from('publish_queue')
      .select(`
        *,
        video_jobs (*),
        social_accounts (*)
      `)
      .eq('id', queueId)
      .single()

    if (queueError || !queueItem) {
      throw new Error(`Queue item not found: ${queueError?.message}`)
    }

    const videoJob = queueItem.video_jobs as { output_url: string }
    const socialAccount = queueItem.social_accounts as {
      platform: string
      access_token_encrypted: string
      account_id: string
    }

    if (!videoJob?.output_url) {
      throw new Error('Video not ready for publishing')
    }

    // Update status to uploading
    await supabase
      .from('publish_queue')
      .update({ status: 'uploading', attempts: queueItem.attempts + 1 })
      .eq('id', queueId)

    // Build caption
    const caption = [
      queueItem.caption,
      queueItem.hashtags?.map((h: string) => `#${h}`).join(' '),
    ]
      .filter(Boolean)
      .join('\n\n')

    let result: { postId: string; postUrl: string }

    // Decrypt access token (in production, use proper encryption)
    const accessToken = socialAccount.access_token_encrypted // Should be decrypted

    switch (socialAccount.platform) {
      case 'linkedin':
        result = await publishToLinkedIn(
          accessToken,
          videoJob.output_url,
          caption,
          socialAccount.account_id
        )
        break
      case 'twitter':
        result = await publishToTwitter(accessToken, videoJob.output_url, caption)
        break
      case 'tiktok':
      case 'instagram':
        // These would need their own implementations
        throw new Error(`${socialAccount.platform} publishing not yet implemented`)
      default:
        throw new Error(`Unknown platform: ${socialAccount.platform}`)
    }

    // Update queue with success
    await supabase
      .from('publish_queue')
      .update({
        status: 'published',
        platform_post_id: result.postId,
        platform_url: result.postUrl,
        published_at: new Date().toISOString(),
      })
      .eq('id', queueId)

    return new Response(
      JSON.stringify({
        success: true,
        postId: result.postId,
        postUrl: result.postUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Publish error:', error)

    // Update queue with error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { queueId } = await req.clone().json().catch(() => ({}))
    if (queueId) {
      await supabase
        .from('publish_queue')
        .update({ status: 'failed', error_message: error.message })
        .eq('id', queueId)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
