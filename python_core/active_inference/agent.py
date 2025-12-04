from pymdp.agent import Agent
import numpy as np

class ActiveAgent:
    def __init__(self):
        # Simple setup for demonstration
        # 2 Hidden states, 2 Observations, 2 Actions
        
        # A matrix: Observation likelihood
        A = np.eye(2) 
        
        # B matrix: Transition dynamics
        B = np.eye(2).reshape(2, 2, 1) # Static world for now
        
        # C matrix: Preferences (prefer observation 0)
        C = np.array([1.0, 0.0])
        
        self.agent = Agent(A=A, B=B, C=C)

    def step(self, observation_idx):
        qs = self.agent.infer_states(observation_idx)
        q_pi, g = self.agent.infer_policies()
        action = self.agent.sample_action()
        return action

if __name__ == "__main__":
    agent = ActiveAgent()
    print("Active Inference Agent initialized.")
    action = agent.step(0)
    print(f"Agent chose action: {action}")
