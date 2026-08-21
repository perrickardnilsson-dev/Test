type EventHandler = (payload: unknown) => Promise<void> | void;

const handlers = new Map<string, Set<EventHandler>>();

/**
 * In-process event-buss. Moduler pratar via events, inte via varandras tabeller.
 */
export function on(event: string, handler: EventHandler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

export async function emit(event: string, payload: unknown): Promise<void> {
  const set = handlers.get(event);
  if (!set) return;
  for (const handler of set) {
    await handler(payload);
  }
}
