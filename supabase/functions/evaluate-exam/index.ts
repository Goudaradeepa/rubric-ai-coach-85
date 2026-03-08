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

    const { questions, answers, examTitle } = await req.json();

    // Build evaluation prompt
    const evaluationPrompt = questions.map((q: any) => {
      const studentAnswer = answers.find((a: any) => a.questionId === q.id);
      const criteriaList = q.rubricCriteria.map((c: any) => `- ${c.name} (max ${c.maxScore} points): ${c.description}`).join("\n");
      return `
## Question ${q.questionNumber} (${q.marks} marks)
**Question:** ${q.questionText}
**Model Answer:** ${q.modelAnswer}
**Student Answer:** ${studentAnswer?.answer || "(No answer provided)"}
**Rubric Criteria:**
${criteriaList}
`;
    }).join("\n---\n");

    const systemPrompt = `You are an expert exam evaluator. Evaluate student answers against model answers using rubric criteria. Be fair, thorough, and constructive.

For each question, you must evaluate every rubric criterion and provide:
- A score (0 to maxScore) 
- Specific feedback for that criterion
- A semantic similarity score (0.0-1.0) comparing the student answer to the model answer
- Any misconceptions detected
- Overall feedback for the question
- A list of key concepts the student correctly demonstrated (detectedConcepts)
- A list of important concepts that are missing from the student's answer (missingConcepts)

Be generous for answers that demonstrate understanding even with different wording than the model answer. Be strict about factual errors.`;

    const userPrompt = `Evaluate the following exam "${examTitle}":

${evaluationPrompt}

Return your evaluation using the evaluate_exam tool.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "evaluate_exam",
              description: "Return structured evaluation results for all questions",
              parameters: {
                type: "object",
                properties: {
                  questionEvaluations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        questionId: { type: "string" },
                        questionNumber: { type: "number" },
                        criterionScores: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              criterionId: { type: "string" },
                              criterionName: { type: "string" },
                              score: { type: "number" },
                              maxScore: { type: "number" },
                              feedback: { type: "string" },
                            },
                            required: ["criterionId", "criterionName", "score", "maxScore", "feedback"],
                            additionalProperties: false,
                          },
                        },
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
                        feedback: { type: "string" },
                        semanticSimilarity: { type: "number" },
                        detectedConcepts: { type: "array", items: { type: "string" } },
                        missingConcepts: { type: "array", items: { type: "string" } },
                      },
                      required: ["questionId", "questionNumber", "criterionScores", "misconceptions", "feedback", "semanticSimilarity", "detectedConcepts", "missingConcepts"],
                      additionalProperties: false,
                    },
                  },
                  performanceSummary: { type: "string" },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                },
                required: ["questionEvaluations", "performanceSummary", "strengths", "weaknesses"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "evaluate_exam" } },
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

    const evaluation = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-exam error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
