import { NextRequest, NextResponse } from "next/server"
import { generateText, createGateway, tool } from "ai"
import { auth } from "@/auth"
import { editorActionsPayload } from "@/lib/video-editor/action-schema"
import { buildSystemPrompt } from "@/lib/video-editor/system-prompt"
import type { EditorSnapshot } from "@/stores/video-editor/types"

interface MessageInput {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { messages, editorState } = (await request.json()) as {
      messages: MessageInput[]
      editorState: EditorSnapshot
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 })
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "AI Gateway API key not configured" }, { status: 500 })
    }

    const gateway = createGateway({ apiKey })
    const systemPrompt = buildSystemPrompt(editorState)

    const result = await generateText({
      model: gateway("anthropic/claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      tools: {
        editor_actions: tool({
          description: "Execute video editor operations. Use this tool when the user requests edits to the video timeline, clips, presets, or export.",
          inputSchema: editorActionsPayload,
        }),
      },
      maxOutputTokens: 1024,
    })

    // Extract actions from tool calls
    const editorToolCall = result.toolCalls.find(
      (tc) => tc.toolName === "editor_actions"
    )
    const actions = editorToolCall ? (editorToolCall as { input: { actions: unknown[] } }).input.actions : []

    return NextResponse.json({
      content: result.text || "",
      actions,
    })
  } catch (error) {
    console.error("Video editor chat error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
