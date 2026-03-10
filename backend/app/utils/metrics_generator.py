import random
import csv
import time
from datetime import datetime

services = ["payment", "order", "user", "inventory"]

metrics = {
    "cpu": 0,
    "memory": 0,
    "response_time": 0,
    "requests": 0,
    "error_rate": 0,
    "latency": 0
}

CSV_FILE = "system_metrics.csv"


def generate_metrics():
    service = random.choice(services)

    metrics["cpu"] = random.randint(20, 95)
    metrics["memory"] = random.randint(30, 95)
    metrics["response_time"] = random.randint(80, 900)
    metrics["requests"] = random.randint(100, 500)
    metrics["error_rate"] = random.randint(0, 3)
    metrics["latency"] = random.randint(10, 150)

    return {
        "timestamp": datetime.now().strftime("%H:%M:%S"),
        "service": service,
        **metrics
    }


def save_metrics_to_csv(data):
    file_exists = False

    try:
        with open(CSV_FILE, "r"):
            file_exists = True
    except FileNotFoundError:
        pass

    with open(CSV_FILE, "a", newline="") as csvfile:
        fieldnames = [
            "timestamp",
            "service",
            "cpu",
            "memory",
            "response_time",
            "requests",
            "error_rate",
            "latency"
        ]

        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        if not file_exists:
            writer.writeheader()

        writer.writerow(data)


def update_metrics():
    while True:
        data = generate_metrics()
        save_metrics_to_csv(data)
        time.sleep(2)
