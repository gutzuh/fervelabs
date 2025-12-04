import torch
import torch.nn as nn
from ncps.wirings import AutoNCP
from ncps.torch import LTC

class LiquidNet(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super(LiquidNet, self).__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size
        
        # Define wiring (Neural Circuit Policy)
        wiring = AutoNCP(hidden_size, output_size)
        
        # Liquid Time-Constant Network
        self.ltc = LTC(input_size, wiring, batch_first=True)
        
    def forward(self, x, hx=None):
        return self.ltc(x, hx)

def create_model(input_size=10, hidden_size=20, output_size=2):
    return LiquidNet(input_size, hidden_size, output_size)

if __name__ == "__main__":
    model = create_model()
    print("Liquid Neural Network created:")
    print(model)
    
    # Test inference with dummy data
    dummy_input = torch.randn(1, 20, 10) # Batch=1, Seq=20, Features=10
    output, _ = model(dummy_input)
    print(f"Output shape: {output.shape}")
