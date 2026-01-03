from sentence_transformers import SentenceTransformer, util
from bs4 import BeautifulSoup
import torch
import requests
import re
import time
from functools import wraps


def timer(func):
    """A decorator that measures the execution time of a function."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        result = func(*args, **kwargs)  # Execute the original function
        end_time = time.perf_counter()
        execution_time = end_time - start_time
        print(
            f"Function '{func.__name__}' took {execution_time:.4f} seconds to execute.")
        return result
    return wrapper


visited_pages = set()
displayed_pages = []

model = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
headers = {
    "User-Agent": "WikipediaSpeedrunner/0.1 (educational project; contact: uthmanabdulrahman2008@gmail.com)"
}
target_link = "https://en.wikipedia.org/wiki/John_Stuart_Mill"
target_title = "John_Stuart_Mill"
target_emb = model.encode(target_title, convert_to_tensor=True)


@timer
def scrape_current(url, first_time=None):
    if url.lower() == target_link.lower():
        print("done")
        return 0
    test_set = set()
    requested = requests.get(url=url, headers=headers)
    soup = BeautifulSoup(requested.text, 'html.parser')
    title = soup.find('h1', id='firstHeading').text.strip()
    if first_time:
        displayed_pages.append(title)
    main_page = soup.find('div', id='mw-content-text')
    full_lists = main_page.find_all('a', href=True)
    for link in full_lists:
        try:
            to_be_extracted = link.get('href')
            class_list = link.get('class')
            if (to_be_extracted.startswith('/wiki') and ":" not in to_be_extracted) or (class_list[0] != 'external'):
                if to_be_extracted.startswith("/wiki/"):
                    to_be_extracted = to_be_extracted[len("/wiki/"):]
                    test_set.add(to_be_extracted)
        except TypeError:

            pass
    compare(list(test_set))


def compare(corpus):
    corpus_embs = model.encode(corpus, convert_to_tensor=True)
    cosine_scores = util.cos_sim(target_emb, corpus_embs)[0]

    # Sort indices by score in descending order
    sorted_indices = torch.argsort(cosine_scores, descending=True)

    best_link = None
    for idx in sorted_indices:
        candidate = corpus[idx.item()]
        if candidate not in visited_pages:
            best_link = candidate
            displayed_pages.append(best_link)

            score = cosine_scores[idx].item()
            break

    if best_link is None:
        print("No unvisited links found. Dead end.")
        return

    visited_pages.add(best_link)
    print(f"Top Match: {best_link} (Score: {score:.4f})")

    next_url = f"https://en.wikipedia.org/wiki/{best_link}"
    scrape_current(next_url)


start_url = "https://en.wikipedia.org/wiki/Kutigi"


scrape_current(start_url, first_time=True)


for i in displayed_pages:
    print(f' {i}-> ', end="")
