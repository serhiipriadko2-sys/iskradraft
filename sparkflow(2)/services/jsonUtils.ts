export const cleanAndParseJson = <T,>(text: string): T => {
  try {
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (e) {
    console.error("JSON Parse Error. Raw text:", text);
    throw new Error("Failed to parse JSON response from AI");
  }
};
