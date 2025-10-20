/**
 * Batch processing utility for handling multiple items
 * Provides consistent error handling across batch operations
 */

export interface BatchResult<T> {
  success: boolean;
  result?: T;
  error?: string;
}

export interface BatchProcessOptions {
  /**
   * Process items in parallel (default: false - sequential processing)
   */
  parallel?: boolean;

  /**
   * Maximum number of parallel operations (default: 5)
   */
  maxParallel?: number;

  /**
   * Continue processing if an item fails (default: true)
   */
  continueOnError?: boolean;
}

/**
 * Process a batch of items with a processor function
 * Returns array of results with success/error information for each item
 */
export async function processBatch<TInput, TOutput>(
  items: TInput[],
  processor: (item: TInput, index: number) => Promise<TOutput>,
  options: BatchProcessOptions = {}
): Promise<BatchResult<TOutput>[]> {
  const {
    parallel = false,
    maxParallel = 5,
    continueOnError = true
  } = options;

  if (!parallel) {
    // Sequential processing
    const results: BatchResult<TOutput>[] = [];

    for (let i = 0; i < items.length; i++) {
      try {
        const result = await processor(items[i], i);
        results.push({ success: true, result });
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        if (!continueOnError) {
          break;
        }
      }
    }

    return results;
  }

  // Parallel processing with concurrency limit
  const results: BatchResult<TOutput>[] = new Array(items.length);
  const chunks: Promise<void>[] = [];

  for (let i = 0; i < items.length; i += maxParallel) {
    const chunk = items.slice(i, i + maxParallel);
    const chunkPromises = chunk.map(async (item, chunkIndex) => {
      const globalIndex = i + chunkIndex;
      try {
        const result = await processor(item, globalIndex);
        results[globalIndex] = { success: true, result };
      } catch (error) {
        results[globalIndex] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    chunks.push(Promise.all(chunkPromises).then(() => {}));
  }

  await Promise.all(chunks);
  return results;
}

/**
 * Get summary statistics from batch results
 */
export function getBatchSummary<T>(results: BatchResult<T>[]): {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
} {
  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    errors: results.filter(r => !r.success).map(r => r.error || 'Unknown error')
  };
}
