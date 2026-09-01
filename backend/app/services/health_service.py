import random

from app.services.service_graph import SERVICE_IDS

def evaluate_health(cpu, memory, response):

    if cpu > 90 or memory > 90:
        return "failed"

    elif cpu > 70 or memory > 70 or response > 600:
        return "degraded"

    else:
        return "healthy"


def update_service_health():
    service_health = {}
    for service in SERVICE_IDS:
        cpu = random.randint(20, 95)
        memory = random.randint(30, 95)
        response = random.randint(80, 900)
        service_health[service] = evaluate_health(cpu, memory, response)
    return service_health
