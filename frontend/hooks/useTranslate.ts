"use client";

import { useEffect, useState } from "react";
import { aiTranslate } from "@/lib/translate";

export function useTranslate(texts: string[], lang: "hi" | "en") {
    const [translated, setTranslated] = useState<Record<string, string>>({});

    useEffect(() => {
        if (lang === "en") {
            const original: Record<string, string> = {};
            texts.forEach((t) => (original[t] = t));
            setTranslated(original);
            return;
        }

        async function run() {
            const result: Record<string, string> = {};

            await Promise.all(
                texts.map(async (t) => {
                    result[t] = await aiTranslate(t, lang);
                })
            );

            setTranslated(result);
        }

        run();
    }, [texts.join("|"), lang]);

    return translated;
}