import os
import re
from pypdf import PdfReader

class MinimalPDFKnowledgeIndex:
    def __init__(self):
        self.chunks = []
        self.word_map = {}  # Inverted index map for split-second text lookups
        self.has_data = False

    def parse_document(self, path: str):
        if not os.path.exists(path):
            return False
        try:
            self.chunks = []
            self.word_map = {}
            reader = PdfReader(path)
            
            chunk_id = 0
            for page_num, page in enumerate(reader.pages):
                text = page.extract_text()
                if not text:
                    continue
                
                # Split page data chunks down to clean paragraphs
                blocks = text.split("\n\n")
                for block in blocks:
                    clean_block = block.strip().replace("\n", " ")
                    if len(clean_block) > 40:
                        self.chunks.append({
                            "id": chunk_id,
                            "page": page_num + 1,
                            "text": clean_block
                        })
                        
                        # Pre-catalog every word inside this chunk for rapid mapping lookups later
                        words = set(re.findall(r'\b[a-zA-Z]{4,15}\b', clean_block.lower()))
                        for word in words:
                            if word not in self.word_map:
                                self.word_map[word] = []
                            self.word_map[word].append(chunk_id)
                            
                        chunk_id += 1
                        
            self.has_data = len(self.chunks) > 0
            print(f"[+] Document Index Pre-Compiled Successfully. Cached {len(self.chunks)} text nodes.")
            return self.has_data
        except Exception as e:
            print(f"[-] Catalog Ingestion Failure: {str(e)}")
            return False

    def scan_context(self, query: str):
        if not self.has_data:
            return ""
        
        # Clean the input question terms down to core keywords
        query_words = re.findall(r'\b[a-zA-Z]{4,15}\b', query.lower())
        chunk_scores = {}
        
        # Pull matching chunk IDs from the pre-compiled index map in milliseconds
        for word in query_words:
            if word in self.word_map:
                for cid in self.word_map[word]:
                    chunk_scores[cid] = chunk_scores.get(cid, 0) + 1
                    
        if not chunk_scores:
            return ""
            
        # Extract the highest scoring relevant matches instantly
        sorted_chunks = sorted(chunk_scores.items(), key=lambda x: x[1], reverse=True)
        top_matches = [self.chunks[cid]["text"] for cid, score in sorted_chunks[:2]]
        
        return "\n\n".join(top_matches)