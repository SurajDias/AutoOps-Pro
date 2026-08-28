from app.services.service_graph import service_graph


def find_affected_services_and_paths(failed_service, dependencies=None):
    """Find dependent services, failure paths, and maximum cascade depth."""
    dependencies = service_graph if dependencies is None else dependencies
    if failed_service not in dependencies:
        return [], [], 0

    reverse_graph = {service: [] for service in dependencies}
    for service, service_dependencies in dependencies.items():
        for dependency in service_dependencies:
            if dependency in reverse_graph:
                reverse_graph[dependency].append(service)

    affected = []
    paths = []
    queue = [(failed_service, 0, [failed_service])]
    visited = {failed_service: 0}
    max_depth = 0

    while queue:
        current, depth, current_path = queue.pop(0)
        for dependent in reverse_graph[current]:
            new_depth = depth + 1
            new_path = current_path + [dependent]
            paths.append(" -> ".join(new_path))
            max_depth = max(max_depth, new_depth)
            if dependent not in visited:
                visited[dependent] = new_depth
                affected.append(dependent)
                queue.append((dependent, new_depth, new_path))

    return affected, paths, max_depth


def calculate_severity(affected_services):
    count = len(affected_services)
    if count == 0:
        return "low"
    if count == 1:
        return "medium"
    return "high"


def cascade_predict(failed_service):
    """Return the predicted blast radius for a service failure."""
    if failed_service not in service_graph:
        return {"error": "Service not found", "service": failed_service}

    affected, paths, depth = find_affected_services_and_paths(failed_service)
    return {
        "failed_service": failed_service,
        "affected_services": affected,
        "affected_count": len(affected),
        "severity": calculate_severity(affected),
        "cascade_depth": depth,
        "failure_path": paths,
    }

