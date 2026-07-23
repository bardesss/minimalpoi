"""In-process pub/sub hub for live route updates (SSE fan-out).

Single-process only: subscribers hold a thread-safe queue.Queue, so publish()
works from both sync endpoints (threadpool) and async endpoints (event loop)
without any loop coordination. Not valid across uvicorn --workers > 1.
"""
import queue
from collections import defaultdict


class RouteEventHub:
    def __init__(self, maxsize: int = 100) -> None:
        self._maxsize = maxsize
        self._subs: dict[int, set[queue.Queue]] = defaultdict(set)

    def subscribe(self, route_id: int) -> queue.Queue:
        q: queue.Queue = queue.Queue(maxsize=self._maxsize)
        self._subs[route_id].add(q)
        return q

    def unsubscribe(self, route_id: int, q: queue.Queue) -> None:
        subs = self._subs.get(route_id)
        if subs is not None:
            subs.discard(q)
            if not subs:
                self._subs.pop(route_id, None)

    def publish(self, route_id: int, event: dict) -> None:
        # Snapshot so a concurrent (un)subscribe can't mutate the set mid-iteration.
        for q in list(self._subs.get(route_id, ())):
            try:
                q.put_nowait(event)
            except queue.Full:
                pass  # slow subscriber: drop rather than stall a mutation


def route_hub(request) -> "RouteEventHub | None":
    return getattr(request.app.state, "route_hub", None)
