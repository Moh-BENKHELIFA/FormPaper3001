#!/usr/bin/env python3
"""
Script d'extraction de DOI depuis un fichier PDF
Utilise PyPDF2 pour extraire le texte et rechercher un DOI
"""

import sys
import json
import re
import PyPDF2
import requests
from pathlib import Path

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un fichier PDF"""
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""

            # Extraire le texte des premières pages (généralement suffisant pour le DOI)
            max_pages = min(3, len(reader.pages))
            for page_num in range(max_pages):
                page = reader.pages[page_num]
                text += page.extract_text()

            return text
    except Exception as e:
        print(f"Erreur lors de l'extraction du texte: {e}", file=sys.stderr)
        return ""

def find_doi_in_text(text):
    """Recherche un DOI dans le texte"""
    # Patterns courants pour les DOI
    doi_patterns = [
        r'(?:doi:|DOI:)\s*([^\s]+)',
        r'(?:https?://)?(?:dx\.)?doi\.org/([^\s]+)',
        r'(?:https?://)?doi\.org/([^\s]+)',
        r'\b(10\.\d{4,}/[^\s]+)',
        r'doi\s*:\s*([^\s]+)',
        r'DOI\s*:\s*([^\s]+)'
    ]

    for pattern in doi_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            # Nettoyer le DOI
            doi = match.strip().rstrip('.,;')
            if validate_doi(doi):
                return doi

    return None

def validate_doi(doi):
    """Valide le format d'un DOI"""
    if not doi:
        return False

    # Format basique: 10.xxxx/yyyy
    doi_pattern = r'^10\.\d{4,}/[-._;()\/<>a-zA-Z0-9]+$'
    return bool(re.match(doi_pattern, doi))

def fetch_doi_metadata(doi):
    """Récupère les métadonnées d'un DOI via l'API CrossRef"""
    try:
        url = f"https://api.crossref.org/works/{doi}"
        headers = {
            'Accept': 'application/json',
            'User-Agent': 'FormPaper3001/1.0 (mailto:user@example.com)'
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        data = response.json()
        work = data.get('message', {})

        # Extraire les informations pertinentes
        title = work.get('title', [''])[0] if work.get('title') else ''

        authors = []
        if work.get('author'):
            for author in work['author']:
                given = author.get('given', '')
                family = author.get('family', '')
                full_name = f"{given} {family}".strip()
                if full_name:
                    authors.append(full_name)

        authors_str = ', '.join(authors)

        # Date de publication
        published = work.get('published-print') or work.get('published-online')
        publication_date = ''
        if published and published.get('date-parts'):
            date_parts = published['date-parts'][0]
            if len(date_parts) >= 3:
                publication_date = f"{date_parts[0]}-{date_parts[1]:02d}-{date_parts[2]:02d}"
            elif len(date_parts) >= 2:
                publication_date = f"{date_parts[0]}-{date_parts[1]:02d}"
            elif len(date_parts) >= 1:
                publication_date = str(date_parts[0])

        # Conférence/Journal
        conference = ''
        if work.get('container-title'):
            conference = work['container-title'][0]

        # URL
        url = work.get('URL', f"https://doi.org/{doi}")

        return {
            'title': title,
            'authors': authors_str,
            'publication_date': publication_date,
            'conference': conference,
            'doi': doi,
            'url': url
        }

    except requests.RequestException as e:
        print(f"Erreur lors de la récupération des métadonnées: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"Erreur inattendue: {e}", file=sys.stderr)
        return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python extract_doi.py <chemin_vers_pdf>", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    if not Path(pdf_path).exists():
        print(f"Fichier non trouvé: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    # Extraire le texte du PDF
    text = extract_text_from_pdf(pdf_path)

    if not text:
        print("Impossible d'extraire le texte du PDF", file=sys.stderr)
        sys.exit(1)

    # Rechercher le DOI
    doi = find_doi_in_text(text)

    if not doi:
        print("Aucun DOI trouvé dans le PDF", file=sys.stderr)
        sys.exit(1)

    # Récupérer les métadonnées
    metadata = fetch_doi_metadata(doi)

    if metadata:
        print(json.dumps(metadata, ensure_ascii=False, indent=2))
    else:
        # Retourner au moins le DOI trouvé
        result = {
            'title': '',
            'authors': '',
            'publication_date': '',
            'conference': '',
            'doi': doi,
            'url': f"https://doi.org/{doi}"
        }
        print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()