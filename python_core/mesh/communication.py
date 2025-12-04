import zenoh
import time
import threading

class MeshNode:
    def __init__(self, role="peer"):
        self.config = zenoh.Config()
        self.session = zenoh.open(self.config)
        self.role = role
        print(f"Zenoh session opened as {role}")

    def publish(self, key, value):
        self.session.put(key, value)
        print(f"Published to {key}: {value}")

    def subscribe(self, key, callback):
        def listener(sample):
            callback(sample.payload.decode('utf-8'))
        
        self.session.declare_subscriber(key, listener)
        print(f"Subscribed to {key}")

    def close(self):
        self.session.close()

if __name__ == "__main__":
    # Simple test
    node = MeshNode()
    
    def on_msg(msg):
        print(f"Received: {msg}")

    node.subscribe("ferve/test", on_msg)
    
    time.sleep(1)
    node.publish("ferve/test", "Hello from the Mesh!")
    
    time.sleep(1)
    node.close()
