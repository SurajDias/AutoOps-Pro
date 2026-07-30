def get_dependencies():
    """
    Defines service dependency graph
    """
    return {
        "payment": ["order"],
        "order": ["inventory"],
        "user": ["payment"]
    }


def find_affected_services_and_paths(failed_service, dependencies):
    """
    Finds affected services, paths, and depth
    """
    affected = set()
    stack = [(failed_service, 0)]  # (service, depth)
    max_depth = 0
    paths = []

    while stack:
        current, depth = stack.pop()

        if current in dependencies:
            for service in dependencies[current]:
                if service not in affected:
                    affected.add(service)
                    stack.append((service, depth + 1))

                    # track path
                    paths.append(f"{current} → {service}")

                    # update depth
                    if depth + 1 > max_depth:
                        max_depth = depth + 1

    return list(affected), paths, max_depth


def calculate_severity(affected_services):
    """
    Determines severity
    """
    count = len(affected_services)

    if count == 0:
        return "low"
    elif count == 1:
        return "medium"
    else:
        return "high"


def cascade_predict(failed_service):
    """
    Main function
    """
    dependencies = get_dependencies()

    affected_services, paths, depth = find_affected_services_and_paths(
        failed_service, dependencies
    )

    affected_count = len(affected_services)
    severity = calculate_severity(affected_services)

    return {
        "failed_service": failed_service,
        "affected_services": affected_services,
        "affected_count": affected_count,
        "severity": severity,
        "cascade_depth": depth,
        "failure_path": paths
    }

