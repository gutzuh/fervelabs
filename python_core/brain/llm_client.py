import ollama

class LocalBrain:
    def __init__(self, model="llama3"):
        self.model = model

    def generate(self, prompt):
        """Generates text response from the local LLM."""
        try:
            response = ollama.chat(model=self.model, messages=[
                {'role': 'user', 'content': prompt},
            ])
            return response['message']['content']
        except Exception as e:
            return f"Error communicating with Ollama: {e}"

    def generate_code(self, prompt):
        """Specialized generation for code."""
        system_prompt = "You are a Python coding assistant. Output only valid Python code without markdown formatting."
        full_prompt = f"{system_prompt}\n\n{prompt}"
        return self.generate(full_prompt)

if __name__ == "__main__":
    brain = LocalBrain()
    print("Brain initialized. Testing connection...")
    print(brain.generate("Hello, are you online?"))
