
/**
 * Helper to prevent rate limiting (429) errors from Google AI API
 */

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function safeCallApi<T>(apiFunction: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            // Thêm time.sleep(1) giữa các request để giảm tốc độ gọi API
            await sleep(1000);

            const result = await apiFunction();

            // Handle fetch Response object (check status 429)
            if (result && typeof result === 'object' && 'status' in result && (result as any).status === 429) {
                throw new Error("429 TooManyRequests");
            }

            return result;

        } catch (error: any) {
            const errorMsg = error?.message || String(error);

            if (errorMsg.includes("429") || errorMsg.includes("TooManyRequests") || errorMsg.includes("quota")) {
                if (attempt < 4) {
                    // Exponential backoff: delay = 2^attempt + random(0–1)
                    const delaySec = Math.pow(2, attempt) + Math.random();
                    console.log(`Rate limit hit. Retrying in ${delaySec.toFixed(2)}s...`);
                    await sleep(delaySec * 1000);
                    continue;
                }
            }
            throw error;
        }
    }

    throw new Error("Failed after 5 retries due to 429 error");
}
