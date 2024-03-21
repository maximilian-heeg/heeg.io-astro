import axios, { AxiosError } from "axios";

export async function makeRequest(url: string): Promise<any> {
  let retryCount = 0;
  while (retryCount < 4) {
    try {
      const response = await axios.get(url, {
        headers: {
          "x-api-key": import.meta.env.SEMANTIC_API_KEY,
        },
      });
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status !== 429) {
        throw error; // Re-throw error if it's not a 429 status
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause for 1 second
    retryCount++;
  }
  throw new Error("Max retries exceeded");
}
