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

    const { fileUrl, mimeType, questionCount } = await req.json();
    if (!fileUrl) throw new Error("fileUrl is required");

    const fileResp = await fetch(fileUrl);
    if (!fileResp.ok) throw new Error(`Failed to fetch file: ${fileResp.status}`);
    const bytes = new Uint8Array(await fileResp.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);

    const detectedMime = mimeType || "image/png";
    const isPdf = detectedMime.includes("pdf");

    const systemPrompt = `You are an expert OCR system that extracts handwritten and printed text from scanned exam answer sheets. 
You must:
1. Extract ALL text from the document accurately
2. Detect student information: name, roll number/ID, class/section if visible
3. Identify and separate answers by question number (Q1, Q2, Q3, etc.)
4. If question numbers aren't clearly visible, detect answer boundaries based on spacing/formatting
5. Preserve the student's original text as accurately as possible
6. Handle both handwritten and typed text`;

    const userPrompt = `Extract all text from this scanned answer sheet. ${questionCount ? `The exam has ${questionCount} questions.` : "Detect how many questions there are."}

Also detect the student's name, roll number/ID, and any exam information visible on the sheet.
Separate the text by question number. Use the extract_answers tool to return structured results.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: `data:${detectedMime};base64,${base64}` },
          },
        ],
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_answers",
              description: "Return extracted text organized by question with student info",
              parameters: {
                type: "object",
                properties: {
                  studentName: {
                    type: "string",
                    description: "Detected student name from the sheet, or empty string if not found",
                  },
                  rollNumber: {
                    type: "string",
                    description: "Detected roll number/student ID, or empty string if not found",
                  },
                  detectedSubject: {
                    type: "string",
                    description: "Detected subject/exam name from the sheet, or empty string if not found",
                  },
                  fullText: {
                    type: "string",
                    description: "The complete extracted text from the document",
                  },
                  answers: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        questionNumber: { type: "number" },
                        extractedText: { type: "string" },
                        confidence: {
                          type: "number",
                          description: "OCR confidence 0.0-1.0",
                        },
                      },
                      required: ["questionNumber", "extractedText", "confidence"],
                      additionalProperties: false,
                    },
                  },
                  totalQuestionsDetected: { type: "number" },
                },
                required: ["studentName", "rollNumber", "detectedSubject", "fullText", "answers", "totalQuestionsDetected"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_answers" } },
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
    console.error("ocr-extract error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
