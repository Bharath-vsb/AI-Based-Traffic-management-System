import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('No image provided');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    console.log('Analyzing traffic image with AI vision...');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this traffic image and provide REALISTIC vehicle detection:

1) Count ONLY clearly visible, individual vehicles. Be conservative and realistic:
   - Count each 2-wheeler, auto-rickshaw, car, bus, truck as ONE vehicle
   - DO NOT estimate or guess vehicles you cannot see
   - For partially visible vehicles at edges, count only if >50% visible
   - In dense traffic, count row by row to avoid duplication
   - Typical single lane: 3-8 vehicles for light, 10-20 for moderate, 25-40 for heavy
   - Multi-lane intersections: multiply by number of visible lanes
   - IMPORTANT: Be realistic - a typical traffic signal photo shows 10-30 vehicles, rarely more than 50 unless it's a very wide multi-lane view

2) Emergency vehicle detection with robust cues:
   - Text: "AMBULANCE", "AMB", "AMBULAN", "108" on vehicle body
   - Visual: Red cross/plus symbol, red/blue roof lights
   - Body: White/yellow with red stripes/markings
   - Set hasEmergency=true if confident, emergencyConfidence 0-1

3) Congestion level (0-1):
   - 0-0.3: Light traffic, vehicles moving freely
   - 0.3-0.6: Moderate, some gaps between vehicles
   - 0.6-0.85: Heavy, vehicles close together
   - 0.85-1.0: Severe congestion, bumper-to-bumper

Return ONLY JSON (no markdown):
{
  "vehicleCount": <realistic count of clearly visible vehicles>,
  "hasEmergency": <boolean>,
  "emergencyConfidence": <number 0-1>,
  "emergencyFeatures": {
    "hasAmbulanceText": <boolean>,
    "has108Text": <boolean>,
    "hasRedCross": <boolean>,
    "hasEmergencyLights": <boolean>
  },
  "congestionLevel": <number 0-1>
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI response:', content);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-traffic-image function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        vehicleCount: 0,
        hasEmergency: false,
        emergencyConfidence: 0,
        congestionLevel: 0
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
