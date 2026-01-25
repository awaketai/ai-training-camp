import blake3


def compute_text_hash(text: str) -> str:
    """Compute a 16-character hash of the input text using BLAKE3."""
    return blake3.blake3(text.encode("utf-8")).hexdigest()[:16]
