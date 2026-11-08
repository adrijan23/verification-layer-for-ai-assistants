/** Build a Server-Sent Events response. `start` returns a cleanup function. */
export function sseResponse(
  req: Request,
  start: (send: (data: unknown, event?: string) => void) => () => void,
): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const write = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          // stream closed
        }
      };
      const send = (data: unknown, event?: string) =>
        write(`${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`);
      write(': connected\n\n');
      const stop = start(send);
      const ping = setInterval(() => write(': ping\n\n'), 15000);
      cleanup = () => {
        clearInterval(ping);
        stop();
      };
      req.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
}
