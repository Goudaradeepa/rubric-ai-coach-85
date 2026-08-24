import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { questions, subject } = await req.json();
    if (!Array.isArray(questions) || questions.length === 0) throw new Error("questions array is required");

    const systemPrompt = `You generate question-wise evaluation rubrics for university answer scripts.
For every question produce:
- a concise model answer a full-mark script would contain
- rubric criteria whose marks sum EXACTLY to the question's maximum marks
Use this default marking pattern, scaled to the question marks and its Bloom's Level:
  Basic concept / definition (~20%), Main concepts / factors (~30%), Detailed explanation (~30%), Example / application / conclusion (~20%).
Each criterion needs a name, a short description of what earns the marks, the expected concept keywords, and maxScore.
Round criterion marks to whole or half marks and make the sum exact.`;

    const list = questions.map((q: any) => `
[qid:${q.id}] ${q.module ? q.module + " | " : ""}Q${q.questionNumber}${q.subQuestion ? "(" + q.subQuestion + ")" : ""} — ${q.marks} marks${q.bloomLevel ? " | BL: " + q.bloomLevel : ""}${q.courseOutcome ? " | CO: " + q.courseOutcome : ""}
${q.questionText}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Subject: ${subject || "General"}\n\nGenerate rubrics for these questions using the generate_rubrics tool:\n${list}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_rubrics",
              description: "Return question-wise model answers and rubric criteria",
              parameters: {
                type: "object",
                properties: {
                  rubrics: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        questionId: { type: "string" },
                        modelAnswer: { type: "string" },
                        criteria: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string" },
                              description: { type: "string" },
                              expectedConcept: { type: "string" },
                              maxScore: { type: "number" },
                            },
                            required: ["name", "description", "expectedConcept", "maxScore"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["questionId", "modelAnswer", "criteria"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rubrics"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_rubrics" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    return new Response(toolCall.function.arguments, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-rubrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
