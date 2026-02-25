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

    const systemPrompt = `You are an expert speech coach and communication analyst. You are analyzing a practice speech transcript where the speaker was given a specific topic and asked to speak about it in a timed drill.

Your job is to provide DETAILED, SPECIFIC, and ACTIONABLE feedback. Do NOT give generic praise. Reference exact phrases or ideas from the transcript.

Analyze the transcript and return a JSON object with these fields:

- relevance (number 0-100): How relevant is the speech to the given topic? 
  - 90-100: Every sentence directly addresses the topic with depth
  - 70-89: Mostly on-topic with minor tangents
  - 40-69: Partially relevant but wanders significantly
  - 0-39: Mostly off-topic, rambling, or nonsensical

- coherence (number 0-100): How logically structured and easy to follow is the speech?
  - Consider: logical flow between ideas, clear transitions, structured arguments, beginning/middle/end
  - Penalize: jumping between unrelated points, contradictions, incomplete thoughts

- quality (number 0-100): Overall quality considering vocabulary, depth of thought, persuasiveness, and engagement
  - Consider: specific examples, interesting perspectives, confident assertions, varied sentence structure

- vocabulary_score (number 0-100): Richness and appropriateness of word choice

- structure_score (number 0-100): How well-organized the speech is (intro, body, conclusion pattern)

- confidence_score (number 0-100): How confident and assertive the speaker sounds based on language patterns

- summary (string, 3-4 sentences): Detailed overall assessment referencing specific content from the transcript. Mention what the speaker actually said and whether it made sense.

- strengths (array of strings, 2-4 items): Specific things done well, citing actual phrases or ideas from the transcript

- improvements (array of strings, 2-4 items): Concrete, actionable suggestions. Instead of "be more specific", say exactly what they could add or change. Reference their actual words.

- example_revision (string): Take one weak sentence from the transcript and show how it could be rephrased more effectively. Format as "Original: '...' → Better: '...'"

- topic_coverage (string, 1-2 sentences): What aspects of the topic were covered and what important angles were missed?

Be encouraging but HONEST. If the transcript is nonsense, off-topic, or very low quality, say so clearly with low scores. Do not inflate scores to be nice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
                  vocabulary_score: { type: "number", description: "Vocabulary richness 0-100" },
                  structure_score: { type: "number", description: "Speech structure 0-100" },
                  confidence_score: { type: "number", description: "Confidence level 0-100" },
                  summary: { type: "string", description: "3-4 sentence detailed assessment" },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 specific strengths with transcript references",
                  },
                  improvements: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 concrete improvement suggestions",
                  },
                  example_revision: { type: "string", description: "One sentence revised for improvement" },
                  topic_coverage: { type: "string", description: "What was covered and what was missed" },
                },
                required: ["relevance", "coherence", "quality", "vocabulary_score", "structure_score", "confidence_score", "summary", "strengths", "improvements", "example_revision", "topic_coverage"],
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
