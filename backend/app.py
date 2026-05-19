import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from google import genai
from google.genai import types
from dotenv import load_dotenv
from vector_engine import MinimalPDFKnowledgeIndex

base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, '.env'))

app = Flask(__name__)
CORS(app)

client = genai.Client()
index_engine = MinimalPDFKnowledgeIndex()

if os.path.exists("dataset.pdf"):
    index_engine.parse_document("dataset.pdf")

@app.route("/api/chat", methods=["POST"])
def handle_chat_endpoint():
    payload = request.json or {}
    message = payload.get("message", "")
    routing_mode = payload.get("routing_mode", "HYBRID")

    # High-speed index lookup execution
    context = index_engine.scan_context(message) if routing_mode in ["PDF_FIRST", "HYBRID"] else ""
    source_type = "pdf" if (context and routing_mode != "AI_MODE") else "ai"

    # Minimalist system rules prompt configuration to prevent AI over-thinking lag
    if routing_mode == "PDF_FIRST":
        system_rules = f"Answer concisely using ONLY this text context:\n{context}\nIf missing, say 'Context Unverified'."
    elif routing_mode == "AI_MODE":
        system_rules = "Answer concisely using general knowledge."
    else: # HYBRID MODE
        system_rules = (
            f"Context:\n{context}\n"
            "If context answers the query, reply concisely using ONLY the context. "
            "Otherwise, answer concisely using general knowledge."
        )

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=system_rules,
                temperature=0.4,          # Low temperature speeds up output generations
                max_output_tokens=800     # Stops the model from wasting time generating unnecessary walls of text
            )
        )
        
        return jsonify({
            "reply": response.text,
            "source_type": source_type
        })
    except Exception as e:
        return jsonify({"reply": "Momentary timeout connection glitch. Resubmit prompt.", "source_type": "ai"}), 200

if __name__ == "__main__":
    app.run(port=5000, debug=True)