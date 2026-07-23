import queue

from app.routing.events import RouteEventHub


def test_hub_fans_out_to_all_subscribers_of_a_route():
    hub = RouteEventHub()
    q1 = hub.subscribe(1)
    q2 = hub.subscribe(1)
    other = hub.subscribe(2)

    hub.publish(1, {"type": "update"})

    assert q1.get_nowait() == {"type": "update"}
    assert q2.get_nowait() == {"type": "update"}
    assert other.empty()  # a different route id is untouched


def test_unsubscribe_stops_delivery():
    hub = RouteEventHub()
    q = hub.subscribe(1)
    hub.unsubscribe(1, q)
    hub.publish(1, {"x": 1})
    assert q.empty()


def test_publish_drops_when_a_subscriber_queue_is_full():
    hub = RouteEventHub(maxsize=1)
    q = hub.subscribe(1)
    hub.publish(1, {"n": 1})
    hub.publish(1, {"n": 2})  # second is dropped, not blocked
    assert q.get_nowait() == {"n": 1}
    assert q.empty()


def test_publish_to_a_route_with_no_subscribers_is_a_noop():
    hub = RouteEventHub()
    hub.publish(99, {"x": 1})  # must not raise
