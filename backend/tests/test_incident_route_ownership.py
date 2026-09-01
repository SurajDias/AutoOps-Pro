"""Route registration coverage for the incident API root."""

from app.api.incident_api import home as incident_api_home
from app.main import app


def test_incident_root_is_owned_by_the_incident_router():
    incident_routes = [
        route
        for route in app.routes
        if getattr(route, "path", None) in {"/incidents", "/incidents/"}
    ]

    assert incident_routes
    assert all(route.path == "/incidents/" for route in incident_routes)

    get_routes = [route for route in incident_routes if "GET" in route.methods]
    assert len(get_routes) == 1
    route = get_routes[0]
    assert route.endpoint is incident_api_home
    assert route.methods == {"GET"}
