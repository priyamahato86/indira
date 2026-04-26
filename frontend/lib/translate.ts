// lib/translate.ts

const cache = new Map<string, string>();

export async function aiTranslate(text: string, target: "hi" | "en"): Promise<string> {
    const key = `${target}:${text}`;

    if (cache.has(key)) return cache.get(key)!;

    try {
        const res = await fetch("/api/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, target }),
        });

        if (!res.ok) {
            console.error("Translation API error:", res.status);
            return text;
        }

        const data = await res.json();
        const translation: string = data.translation ?? text;

        cache.set(key, translation);
        return translation;
    } catch (err) {
        console.error("Translation fetch error:", err);
        return text;
    }
}