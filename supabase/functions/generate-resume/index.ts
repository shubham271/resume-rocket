import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { personalInfo, skills, experiences, educations, certifications } = resumeData;

    const prompt = `Generate a professional, ATS-friendly resume based on the following information. Format it cleanly with clear sections.

PERSONAL INFORMATION:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email || "N/A"}
Phone: ${personalInfo.phone || "N/A"}
Location: ${personalInfo.location || "N/A"}
LinkedIn: ${personalInfo.linkedIn || "N/A"}
Summary: ${personalInfo.summary || "N/A"}

SKILLS:
${skills.join(", ")}

WORK EXPERIENCE:
${experiences.map((e: any) => `- ${e.title} at ${e.company} (${e.startDate} - ${e.endDate})\n  ${e.duties}`).join("\n") || "None provided"}

EDUCATION:
${educations.map((e: any) => `- ${e.degree} in ${e.field} from ${e.institution} (${e.startDate} - ${e.endDate})`).join("\n") || "None provided"}

CERTIFICATIONS:
${certifications.map((c: any) => `- ${c.name} by ${c.issuer} (${c.date})`).join("\n") || "None provided"}

Generate a well-structured, professional resume text. Use clear headings and bullet points. Make it compelling and achievement-oriented. Enhance the duties/responsibilities to be more impactful where appropriate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume writer. Create professional, ATS-optimized resumes." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Usage limit reached." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
