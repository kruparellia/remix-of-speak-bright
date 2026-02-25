import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, topic } = await req.json();

    if (!transcript || !topic) {
      return new Response(
        JSON.stringify({ error: "transcript and topic are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a speech coach analyzing a practice speech transcript. The speaker was given a topic and asked to speak about it for a timed drill.

Analyze the transcript and return a JSON object with these fields:
- relevance (number 0-100): How relevant the speech content is to the given topic
- coherence (number 0-100): How logically structured and coherent the speech is
- quality (number 0-100): Overall quality of the speech content
- summary (string, 1-2 sentences): Brief overall assessment
- strengths (array of strings, 1-3 items): What the speaker did well
- improvements (array of strings, 1-3 items): Specific actionable suggestions to improve

Be encouraging but honest. If the transcript is very short or mostly gibberish, score accordingly but be kind.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Topic: "${topic}"\n\nTranscript:\n${transcript}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "speech_analysis",
              description: "Return structured speech analysis results",
              parameters: {
                type: "object",
                properties: {
                  relevance: { type: "number", description: "Relevance score 0-100" },
                  coherence: { type: "number", description: "Coherence score 0-100" },
                  quality: { type: "number", description: "Overall quality score 0-100" },
                  summary: { type: "string", description: "1-2 sentence assessment" },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-3 strengths",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "1-3 improvement suggestions",
                  },
                },
                required: ["relevance", "coherence", "quality", "summary", "strengths", "improvements"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "speech_analysis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const analysis = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-speech error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
