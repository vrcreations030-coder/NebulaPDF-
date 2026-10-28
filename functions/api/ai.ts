/**
 * Cloudflare Pages Function: /api/ai
 * Provides a secure server-side proxy for optional Gemini AI document analysis.
 * Deployed automatically by Cloudflare Pages when the repository is hosted.
 *
 * Security & Privacy:
 * - Uses server-side GEMINI_API_KEY environment secret configured in Cloudflare Dashboard
 * - Never returns or exposes the API key to client
 * - Strict payload size limit (max 100KB extracted text)
 * - Zero persistence: Document texts are not stored in logs or databases
 */

interface Env {
  GEMINI_API_KEY?: string;
}

type PagesContext<T = any> = {
  request: Request;
  env: T;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
};

export const onRequestPost = async (context: PagesContext<Env>): Promise<Response> => {
  const { request, env } = context;

  // Verify server-side secret is configured
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        message:
          'External AI is not configured. Please add GEMINI_API_KEY to your Cloudflare Pages Environment Variables, or use local privacy heuristic mode.',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate payload size
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > 102400) {
    return new Response(
      JSON.stringify({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Extracted text payload exceeds 100KB limit. Please analyze fewer pages.',
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body: any = await request.json();
    const prompt = body?.prompt;
    const documentText = body?.documentText;
    const task = body?.task || 'summarize';

    if (!documentText && !prompt) {
      return new Response(
        JSON.stringify({ error: 'INVALID_REQUEST', message: 'Missing documentText or prompt' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Prepare system instructions based on task
    let systemInstruction = 'You are NebulaPDF Document Assistant. Provide concise, factual answers strictly grounded in the supplied document text. If not mentioned in the document, explicitly say so.';
    if (task === 'summarize') {
      systemInstruction = 'Provide an executive summary of the document with 3-5 bulleted key takeaways.';
    } else if (task === 'explain') {
      systemInstruction = 'Explain this document passage in clear, accessible everyday English without jargon.';
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: `${systemInstruction}\n\nDocument Text:\n${documentText ? documentText.slice(0, 15000) : ''}\n\nUser Request: ${prompt || 'Analyze this document'}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData: any = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: 'UPSTREAM_API_ERROR',
          message: errData?.error?.message || `Gemini API returned status ${response.status}`,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: any = await response.json();
    const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return new Response(
      JSON.stringify({ result: replyText }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: 'EXECUTION_ERROR',
        message: err?.name === 'AbortError' ? 'AI request timed out after 15 seconds' : err?.message || 'Server proxy error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
