import axios, { AxiosError } from "axios";

export async function makeRequest(url: string): Promise<any> {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    if ((error as AxiosError).response?.status === 429) {
      // Retry logic
      let retryCount = 0;
      while (retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Pause for 1 second
        try {
          const response = await axios.get(url);
          return response.data;
        } catch (error) {
          if ((error as AxiosError).response?.status !== 429) {
            throw error; // Re-throw error if it's not a 429 status
          }
        }
        retryCount++;
      }
      throw new Error("Max retries exceeded");
    } else {
      throw error; // Re-throw error if it's not a 429 status code
    }
  }
}
