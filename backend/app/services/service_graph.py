import random

# Microservice dependency graph
service_graph = {
    "API Gateway": ["Auth Service", "Order Service"],
    "Auth Service": ["Database"],
    "Order Service": ["Payment Service", "Inventory Service"],
    "Payment Service": ["Database"],
    "Inventory Service": ["Database"],
    "Database": []
}

# Current health of services
service_status = {
    "API Gateway": "healthy",
    "Auth Service": "healthy",
    "Order Service": "healthy",
    "Payment Service": "healthy",
    "Inventory Service": "healthy",
    "Database": "healthy"
}

def simulate_failure():
    """
    Randomly trigger a service failure
    """
    failing_service = random.choice(list(service_graph.keys()))
    service_status[failing_service] = "failed"

    cascade = []

    # propagate failures
    for service, dependencies in service_graph.items():
        if failing_service in dependencies:
            service_status[service] = "degraded"
            cascade.append(service)

    return {
        "failed_service": failing_service,
        "cascade_services": cascade,
        "status": service_status
    }
