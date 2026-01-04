from flask_cors import CORS
from sentence_transformers import SentenceTransformer, util
from bs4 import BeautifulSoup
import requests
from flask import Flask, request, jsonify
import torch
from sklearn.decomposition import PCA
import numpy as np
from urllib.parse import unquote

app = Flask(__name__)
CORS(app)

# Load model once on startup
print("Loading Model...")
model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
print("Model Loaded.")
visited = set()
visited_embedding = []
visited_list = []


def get_wiki_title(url):
    """Extracts the clean title from the Wiki URL for display."""
    return url.replace("/wiki/", "").replace("_", " ")


def reduce_to_2d(words, embeddings):
    pca = PCA(n_components=2)
    reduced = pca.fit_transform(embeddings)

    return [
        {
            "word": unquote(word),
            "x": float(vec[0]),
            "y": float(vec[1])
        }
        for word, vec in zip(words, reduced)
    ]


def scrape_and_rank(current_page_slug, target_title, limit=30):
    global visited
    global visited_list
    visited.add(current_page_slug)
    visited_list.append(current_page_slug)

    url = f"https://en.wikipedia.org/wiki/{current_page_slug}"
    proper_url = url.replace("_", " ")
    target_url = f"https://en.wikipedia.org/wiki/{target_title}"

    target_emb = model.encode(target_title)
    if proper_url.lower() == target_url.lower():
        visited_embedding.append(target_emb)
        print(visited_list)
        print(len(visited), len(visited_embedding), 'length')
        np_array_visited = np.array(visited_embedding)
        plot = reduce_to_2d(visited_list, np_array_visited)
        print(plot)
        visited_embedding.clear()
        visited.clear()
        visited_list.clear()
        return {
            "current_title": f'{target_title}',
            "links": [],
            "done": True,
            "plot": plot
        }

    headers = {
        "User-Agent": "WikipediaSpeedrunner/0.2 (educational project)"
    }
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code != 200:
            return {"error": "Page not found"}

        soup = BeautifulSoup(r.text, "html.parser")
        page_title = soup.find("h1", id="firstHeading").text.strip()
        content = soup.find("div", id="mw-content-text")

        links_data = {}

        for a in content.find_all("a", href=True):
            try:
                href = a.get("href")

                if href.startswith("/wiki/") and ":" not in href:
                    slug = href[len("/wiki/"):]
                    if slug in visited:
                        continue

                    if slug not in links_data:
                        text = a.text.strip() or slug.replace("_", " ")
                        links_data[slug] = text

            except TypeError:
                pass

        if not links_data:
            return {"current_title": page_title, "links": []}

        # 🔒 Stable ordering
        unique_slugs = sorted(links_data.keys())

        corpus_embs = model.encode(
            [s.replace("_", " ") for s in unique_slugs],
            convert_to_tensor=False
        )

        scores = util.cos_sim(target_emb, corpus_embs)[0]
        sorted_indices = torch.argsort(scores, descending=True)
        visited_embedding.append(corpus_embs[sorted_indices[0].item()])

        ranked_results = []

        for idx in sorted_indices[:limit]:
            i = idx.item()
            slug = unique_slugs[i]

            ranked_results.append({
                "title": links_data[slug],
                "slug": slug,
                "score": round(float(scores[i]), 4)
            })

        return {
            "current_title": page_title,
            "links": ranked_results,
            "done": False
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}


@app.route("/api/step", methods=["POST"])
def step():
    data = request.json
    # Expecting 'current' (e.g., "Python_(programming_language)") and 'target' (e.g., "Philosophy")
    current_slug = data.get("current")
    target_concept = data.get("target")

    result = scrape_and_rank(current_slug, target_concept)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True)
