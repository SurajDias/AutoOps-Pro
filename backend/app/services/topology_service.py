services = [
    {"id": "gateway", "label": "API Gateway"},
    {"id": "auth", "label": "Auth Service"},
    {"id": "order", "label": "Order Service"},
    {"id": "payment", "label": "Payment Service"},
    {"id": "inventory", "label": "Inventory Service"},
    {"id": "db", "label": "Database"}
]

edges = [
    {"source": "gateway", "target": "auth"},
    {"source": "gateway", "target": "order"},
    {"source": "order", "target": "payment"},
    {"source": "order", "target": "inventory"},
    {"source": "payment", "target": "db"},
    {"source": "inventory", "target": "db"},
    {"source": "auth", "target": "db"}
]


def get_topology():
    return {
        "nodes": services,
        "edges": edges
    }
