// A hung database request must not leave a page or save waiting indefinitely.
// Mutations are not retried here: an aborted response can still have committed.
export function boundedFetch(timeoutMs = 12_000): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}
