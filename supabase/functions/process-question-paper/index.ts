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

    const { fileUrl, mimeType } = await req.json();
    if (!fileUrl) throw new Error("fileUrl is required");

    const isPdf = (mimeType || "").includes("pdf");
    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) throw new Error(`Failed to fetch file: ${fileResp.status}`);
    const bytes = new Uint8Array(await fileResp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);

    const contentBlock = isPdf
      ? { type: "file", file: { filename: "question-paper.pdf", file_data: `data:${mimeType};base64,${base64}` } }
      : { type: "image_url", image_url: { url: `data:${mimeType || "image/png"};base64,${base64}` } };

    const systemPrompt = `You are an academic question-paper parser for a university examination system.
Read the scanned/exported question paper and extract its complete structure:
- subject / course title and course code if visible
- module (e.g. Module-1 .. Module-5) each question belongs to
- question number and sub-question label (a, b, c) when present
- full question text
- maximum marks for the question
- Bloom's Level (BL) and Course Outcome (CO) if printed in the marks table
- OR relationship: questions that are alternatives within the same module share the same orGroup label (e.g. "M1-OR"); use an empty string when the question has no alternative.
Never invent questions that are not present. Keep the printed wording.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: [{ type: "text", text: "Extract the full question paper structure using the extract_question_paper tool." }, contentBlock] },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_question_paper",
              description: "Return the structured question paper",
              parameters: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  courseCode: { type: "string" },
                  examTitle: { type: "string" },
                  totalMarks: { type: "number" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        module: { type: "string" },
                        questionNumber: { type: "number" },
                        subQuestion: { type: "string" },
                        questionText: { type: "string" },
                        marks: { type: "number" },
                        bloomLevel: { type: "string" },
                        courseOutcome: { type: "string" },
                        orGroup: { type: "string" },
                      },
                      required: ["module", "questionNumber", "subQuestion", "questionText", "marks", "bloomLevel", "courseOutcome", "orGroup"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["subject", "courseCode", "examTitle", "totalMarks", "questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_question_paper" } },
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
    console.error("process-question-paper error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
