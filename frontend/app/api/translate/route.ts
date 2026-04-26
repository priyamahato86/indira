// app/api/translate/route.ts
// Uses OpenRouter directly via fetch — works with sk-or-v1* keys

export async function POST(req: Request) {
    const { text, target } = await req.json();

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        },
        body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are a translation engine. Translate the given text accurately. Return ONLY the translated text, no explanation, no quotes.",
                },
                {
                    role: "user",
                    content: `Translate to ${target === "hi" ? "Hindi" : target}: ${text}`,
                },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("OpenRouter error:", err);
        return Response.json({ error: "Translation failed" }, { status: 500 });
    }

    const data = await response.json();
    return Response.json({
        translation: data.choices[0].message.content,
    });
}