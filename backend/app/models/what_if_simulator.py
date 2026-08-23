import json

def predict_failure_risk(metrics: dict) -> str:
    """
    A simple failure prediction function.
    Determines if failure risk is high or low based on system metrics.
    """
    cpu_usage = metrics.get("cpu_usage", 0)
    memory_usage = metrics.get("memory_usage", 0)
    latency = metrics.get("latency", 0)
    error_rate = metrics.get("error_rate", 0)
    
    # Simple rule-based logic to determine failure risk
    if cpu_usage > 85 or memory_usage > 85 or latency > 200 or error_rate > 5:
        return "High"
    return "Low"

class WhatIfSimulator:
    """
    Simulates the impact of different corrective actions on system metrics.
    """
    def __init__(self):
        pass

    def simulate(self, metrics: dict, action: str) -> dict:
        """
        Simulate the effect of a given action on the input metrics.
        Returns a dictionary with the action, updated metrics, and predicted failure risk.
        """
        updated_metrics = metrics.copy()
        
        # Rule-based simulation logic for each action
        if action == "restart_service":
            if "error_rate" in updated_metrics:
                updated_metrics["error_rate"] = max(0, updated_metrics["error_rate"] - 5)
            if "latency" in updated_metrics:
                updated_metrics["latency"] = max(10, updated_metrics["latency"] - 50)
                
        elif action == "scale_cpu":
            if "cpu_usage" in updated_metrics:
                # Based on the example, 90 -> 60 is a decrease of 30
                updated_metrics["cpu_usage"] = max(10, updated_metrics["cpu_usage"] - 30)
            if "latency" in updated_metrics:
                # 250 -> 180 is a decrease of 70
                updated_metrics["latency"] = max(10, updated_metrics["latency"] - 70)
                
        elif action == "increase_memory":
            if "memory_usage" in updated_metrics:
                updated_metrics["memory_usage"] = max(10, updated_metrics["memory_usage"] - 30)
                
        elif action == "increase_db_pool":
            if "latency" in updated_metrics:
                updated_metrics["latency"] = max(10, updated_metrics["latency"] - 100)
            if "error_rate" in updated_metrics:
                updated_metrics["error_rate"] = max(0, updated_metrics["error_rate"] - 2)
                
        elif action == "reroute_traffic":
            if "cpu_usage" in updated_metrics:
                updated_metrics["cpu_usage"] = max(10, updated_metrics["cpu_usage"] - 40)
            if "memory_usage" in updated_metrics:
                updated_metrics["memory_usage"] = max(10, updated_metrics["memory_usage"] - 40)
            if "latency" in updated_metrics:
                updated_metrics["latency"] = max(10, updated_metrics["latency"] - 100)

        # Predict failure risk using the updated metrics
        failure_risk = predict_failure_risk(updated_metrics)

        # Generate a short explanation based on the action applied
        explanations = {
            "restart_service": "Restarting the service cleared states and active connections. This resulted in a significant drop in error rates and freed up resources, slightly dropping latency.",
            "scale_cpu": "Scaling the CPU resources allowed the system to process incoming tasks faster. This resulted in lower overall CPU utilization and reduced request latency.",
            "increase_memory": "Allocating more memory provided additional headroom for caching and processing. This reduced the overall memory usage percentage and prevented out-of-memory errors.",
            "increase_db_pool": "Increasing the database connection pool alleviated connection bottlenecks. This resulted in lower database query latency and fewer timeout errors.",
            "reroute_traffic": "Rerouting traffic away from the current system reduced the overall load. This improved both CPU and memory usage significantly while drastically dropping latency."
        }
        
        explanation = explanations.get(action, f"Action '{action}' was applied, which adjusted system metrics according to predefined simulation rules.")

        # Constructing the result based on the requested format
        result = {
            "action": action,
            "updated_metrics": updated_metrics,
            "failure_risk": failure_risk,
            "explanation": explanation
        }
        
        return result

if __name__ == "__main__":
    # Main test block with sample input and printed output as requested
    simulator = WhatIfSimulator()
    
    sample_input_metrics = {
        "cpu_usage": 90,
        "latency": 250
    }
    
    sample_action = "scale_cpu"
    
    print("Input:")
    print(json.dumps(sample_input_metrics, indent=2))
    
    print(f"\nAction:\n\"{sample_action}\"")
    
    print("\nOutput:")
    simulated_result = simulator.simulate(sample_input_metrics, sample_action)
    print(json.dumps(simulated_result, indent=1))