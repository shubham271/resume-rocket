const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { careers_url, company_name } = await req.json();

    if (!careers_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Careers URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Scrape the careers page
    console.log('Scraping careers page:', careers_url);
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: careers_url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResponse.json();
    if (!scrapeResponse.ok || !scrapeData.success) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to scrape careers page' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    if (!markdown || markdown.length < 50) {
      return new Response(
        JSON.stringify({ success: true, jobs: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Use AI to extract structured job listings
    const truncatedMarkdown = markdown.substring(0, 8000);

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: 'You extract job listings from careers page content. Return structured data using the provided tool.',
          },
          {
            role: 'user',
            content: `Extract all job listings from this careers page of "${company_name}". Here is the page content:\n\n${truncatedMarkdown}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_jobs',
              description: 'Extract job listings from a careers page',
              parameters: {
                type: 'object',
                properties: {
                  jobs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string', description: 'Job title' },
                        location: { type: 'string', description: 'Location or Remote' },
                        type: { type: 'string', description: 'Full-time, Part-time, Contract, etc.' },
                        department: { type: 'string', description: 'Department or team' },
                        apply_url: { type: 'string', description: 'Direct link to apply if available' },
                      },
                      required: ['title'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['jobs'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_jobs' } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit reached, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI usage limit reached.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errText);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to extract jobs' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let jobs: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        jobs = parsed.jobs || [];
      } catch {
        console.error('Failed to parse tool call arguments');
      }
    }

    // Add company name to each job
    jobs = jobs.map((j: any) => ({
      ...j,
      company: company_name,
      location: j.location || 'Not specified',
      type: j.type || 'Full-time',
      department: j.department || '',
      apply_url: j.apply_url || careers_url,
    }));

    console.log(`Extracted ${jobs.length} jobs for ${company_name}`);

    return new Response(
      JSON.stringify({ success: true, jobs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
