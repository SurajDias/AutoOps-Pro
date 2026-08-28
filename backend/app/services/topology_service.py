from app.services.service_graph import SERVICE_DEPENDENCIES, SERVICE_LABELS


def get_topology():
    return {
        "nodes": [
            {"id": service_id, "label": SERVICE_LABELS[service_id]}
            for service_id in SERVICE_DEPENDENCIES
        ],
        "edges": [
            {"source": service_id, "target": dependency}
            for service_id, dependencies in SERVICE_DEPENDENCIES.items()
            for dependency in dependencies
        ],
    }
