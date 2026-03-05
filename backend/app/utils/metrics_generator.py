import random
import time

metrics = {
    "cpu_usage": 30,
    "memory_usage": 40,
    "traffic": 120,
    "response_time": 100
}

def update_metrics():
    while True:
        metrics["cpu_usage"] = random.randint(20, 90)
        metrics["memory_usage"] = random.randint(30, 95)
        metrics["traffic"] = random.randint(100, 1000)
        metrics["response_time"] = random.randint(80, 800)

        time.sleep(2)
