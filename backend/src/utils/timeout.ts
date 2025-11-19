/**
 * Timeout Utility
 *
 * Generic helper for adding timeouts to promises to prevent hanging operations
 */

/**
 * Wraps a promise with a timeout
 * @param promise The promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Custom error message for timeout
 * @returns The promise result or throws timeout error
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Wraps multiple promises with individual timeouts and returns results
 * Failed promises return null instead of throwing
 * @param promises Array of promises to execute
 * @param timeoutMs Timeout in milliseconds per promise
 * @returns Array of results (null for failed promises)
 */
export async function withTimeoutBatch<T>(
  promises: Promise<T>[],
  timeoutMs: number
): Promise<(T | null)[]> {
  return Promise.all(
    promises.map(async (promise) => {
      try {
        return await withTimeout(promise, timeoutMs);
      } catch (error) {
        console.warn('Promise failed or timed out:', error);
        return null;
      }
    })
  );
}
