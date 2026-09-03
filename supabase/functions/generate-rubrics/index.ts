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

    const describe = (q: any) => `
[qid:${q.id}] ${q.module ? q.module + " | " : ""}Q${q.questionNumber}${q.subQuestion ? "(" + q.subQuestion + ")" : ""} — ${q.marks} marks${q.bloomLevel ? " | BL: " + q.bloomLevel : ""}${q.courseOutcome ? " | CO: " + q.courseOutcome : ""}
${q.questionText}`;

    const tools = [
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
    ];

    // Batch the questions: one big call gets truncated by the model's output limit,
    // which used to drop the last question(s) (e.g. Q5) from the response.
    const BATCH_SIZE = 3;
    const batches: any[][] = [];
    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      batches.push(questions.slice(i, i + BATCH_SIZE));
    }

    let rateLimited = false;
    let creditsExhausted = false;

    const runBatch = async (batch: any[]) => {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Subject: ${subject || "General"}\n\nGenerate rubrics for ALL ${batch.length} question(s) below using the generate_rubrics tool. Return one entry per [qid:...]. Keep model answers concise (max ~120 words or a compact code snippet).\n${batch.map(describe).join("\n")}`,
            },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "generate_rubrics" } },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) rateLimited = true;
        if (response.status === 402) creditsExhausted = true;
        console.error("AI gateway error:", response.status, await response.text());
        return [] as any[];
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("No tool call in AI response for batch");
        return [] as any[];
      }
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return Array.isArray(parsed?.rubrics) ? parsed.rubrics : [];
      } catch (err) {
        console.error("Failed to parse rubric batch:", err);
        return [] as any[];
      }
    };

    const results = await Promise.all(batches.map(runBatch));
    const rubrics = results.flat();

    if (rubrics.length === 0) {
      if (creditsExhausted) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (rateLimited) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI did not return any rubrics");
    }

    const missing = questions
      .filter((q: any) => !rubrics.some((r: any) => r.questionId === q.id))
      .map((q: any) => `Q${q.questionNumber}${q.subQuestion || ""}`);
    if (missing.length) console.error("Rubrics missing for:", missing.join(", "));

    return new Response(JSON.stringify({ rubrics, missing }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-rubrics error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
