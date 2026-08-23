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

    const { question, studentAnswer, ocrConfidence } = await req.json();
    if (!question) throw new Error("question is required");

    const criteriaList = (question.rubricCriteria || [])
      .map((c: any) => `- id:${c.id} | ${c.name} (max ${c.maxScore} marks): ${c.description}`)
      .join("\n");

    const systemPrompt = `You are an expert university examiner evaluating a single handwritten answer that was digitised via OCR/HTR.
Evaluate strictly against the approved rubric criteria supplied by the teacher.
Account for OCR noise: do not penalise spelling artefacts that are clearly recognition errors.
For every criterion give marks and a short, specific reason.
Also report:
- semanticSimilarity (0.0-1.0) between the student answer and the model answer
- rubricCoverage (0.0-1.0): the fraction of rubric expectations addressed
- confidenceScore (0.0-1.0): your confidence in this automated evaluation, lowered when OCR text is fragmented, ambiguous or very short
- confidenceLevel: "high" (>=0.75), "medium" (0.5-0.74) or "low" (<0.5)
- requiresTeacherReview: true when confidenceLevel is "low"`;

    const userPrompt = `## Question ${question.questionNumber} (${question.marks} marks)
${question.questionText}

## Model Answer
${question.modelAnswer}

## Approved Rubric Criteria
${criteriaList}

## OCR-extracted Student Answer (OCR confidence: ${ocrConfidence != null ? Math.round(ocrConfidence * 100) + "%" : "unknown"})
${studentAnswer || "(no readable answer extracted)"}

Return the evaluation using the evaluate_answer tool.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_answer",
              description: "Return the criterion-wise evaluation for one answer",
              parameters: {
                type: "object",
                properties: {
                  criterionScores: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        criterionId: { type: "string" },
                        criterionName: { type: "string" },
                        score: { type: "number" },
                        maxScore: { type: "number" },
                        feedback: { type: "string", description: "Reason for the marks awarded" },
                      },
                      required: ["criterionId", "criterionName", "score", "maxScore", "feedback"],
                      additionalProperties: false,
                    },
                  },
                  totalScore: { type: "number" },
                  maxMarks: { type: "number" },
                  feedback: { type: "string" },
                  misconceptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        topic: { type: "string" },
                        description: { type: "string" },
                        suggestion: { type: "string" },
                      },
                      required: ["topic", "description", "suggestion"],
                      additionalProperties: false,
                    },
                  },
                  detectedConcepts: { type: "array", items: { type: "string" } },
                  missingConcepts: { type: "array", items: { type: "string" } },
                  semanticSimilarity: { type: "number" },
                  rubricCoverage: { type: "number" },
                  confidenceScore: { type: "number" },
                  confidenceLevel: { type: "string", enum: ["high", "medium", "low"] },
                  requiresTeacherReview: { type: "boolean" },
                },
                required: [
                  "criterionScores", "totalScore", "maxMarks", "feedback", "misconceptions",
                  "detectedConcepts", "missingConcepts", "semanticSimilarity", "rubricCoverage",
                  "confidenceScore", "confidenceLevel", "requiresTeacherReview",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_answer" } },
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

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-answer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
