export const PDF_BUILD_LIMITS = Object.freeze({
  concurrency: 1, batchPages: 8, maximumBatchPages: 8, cooldownMs: 750,
  minimumCooldownMs: 250, memoryMiB: 1536, cpuPercent: 10, minimumFreeMemoryMiB: 768,
  renderTimeoutMs: 60_000, resourceTimeoutMs: 60_000, browserRestartBatches: 20
});

export function pdfBatches(chapters, size = PDF_BUILD_LIMITS.batchPages) {
  if (!Number.isInteger(size) || size < 1 || size > PDF_BUILD_LIMITS.maximumBatchPages) throw new Error('PDF_BATCH_LIMIT');
  const batches = []; let offset = 0;
  for (const chapter of chapters) {
    for (let start = 0; start < chapter.indices.length; start += size) {
      batches.push({ chapter: chapter.number, offset: offset + start, count: Math.min(size, chapter.indices.length - start) });
    }
    offset += chapter.indices.length;
  }
  return batches;
}

/** Resource pressure stops the offline builder instead of starting more processes. */
export async function waitForPdfResources({ freeMemoryMiB, wait, now = Date.now, timeoutMs = PDF_BUILD_LIMITS.resourceTimeoutMs }) {
  const deadline = now() + timeoutMs;
  while (freeMemoryMiB() < PDF_BUILD_LIMITS.minimumFreeMemoryMiB) {
    if (now() >= deadline) throw new Error('PDF_BUILD_MEMORY_PRESSURE');
    await wait(1000);
  }
}
