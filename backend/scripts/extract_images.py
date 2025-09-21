#!/usr/bin/env python3
"""
Script d'extraction d'images depuis un fichier PDF
Utilise PyMuPDF (fitz) pour extraire les images
"""

import sys
import json
import fitz  # PyMuPDF
import io
from pathlib import Path
from PIL import Image
import hashlib
import os

def extract_images_from_pdf(pdf_path, output_dir=None):
    """Extrait les images d'un fichier PDF"""
    try:
        # Si aucun répertoire de sortie n'est spécifié, utiliser le même répertoire que le PDF
        if output_dir is None:
            output_dir = Path(pdf_path).parent / "images"

        output_dir = Path(output_dir)
        output_dir.mkdir(exist_ok=True)

        # Ouvrir le PDF
        doc = fitz.open(pdf_path)
        images = []
        image_count = 0

        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            image_list = page.get_images()

            for img_index, img in enumerate(image_list):
                try:
                    # Récupérer l'image
                    xref = img[0]
                    pix = fitz.Pixmap(doc, xref)

                    # Vérifier si l'image est en couleur ou en niveaux de gris
                    if pix.n - pix.alpha < 4:  # GRAY ou RGB
                        # Convertir en PNG
                        img_data = pix.tobytes("png")

                        # Créer un hash pour éviter les doublons
                        img_hash = hashlib.md5(img_data).hexdigest()

                        # Vérifier la taille minimale (éviter les icônes/logos trop petits)
                        if pix.width >= 100 and pix.height >= 100:
                            # Nom du fichier
                            filename = f"image_{page_num+1}_{img_index+1}_{img_hash[:8]}.png"
                            filepath = output_dir / filename

                            # Sauvegarder l'image si elle n'existe pas déjà
                            if not filepath.exists():
                                with open(filepath, "wb") as f:
                                    f.write(img_data)

                                image_info = {
                                    "filename": filename,
                                    "path": str(filepath),
                                    "page": page_num + 1,
                                    "width": pix.width,
                                    "height": pix.height,
                                    "size": len(img_data),
                                    "hash": img_hash
                                }

                                images.append(image_info)
                                image_count += 1

                    pix = None

                except Exception as e:
                    print(f"Erreur lors de l'extraction de l'image {img_index} de la page {page_num + 1}: {e}", file=sys.stderr)
                    continue

        doc.close()

        # Trier les images par taille (les plus grandes en premier)
        images.sort(key=lambda x: x['size'], reverse=True)

        return {
            "images": images,
            "total": image_count,
            "output_directory": str(output_dir)
        }

    except Exception as e:
        print(f"Erreur lors de l'extraction des images: {e}", file=sys.stderr)
        return {
            "images": [],
            "total": 0,
            "error": str(e)
        }

def create_thumbnail(image_path, thumbnail_size=(150, 150)):
    """Crée une vignette d'une image"""
    try:
        with Image.open(image_path) as img:
            img.thumbnail(thumbnail_size, Image.Resampling.LANCZOS)

            # Créer le chemin de la vignette
            thumb_path = Path(image_path).with_suffix('.thumb.jpg')

            # Sauvegarder la vignette
            img.save(thumb_path, "JPEG", quality=85)

            return str(thumb_path)

    except Exception as e:
        print(f"Erreur lors de la création de la vignette pour {image_path}: {e}", file=sys.stderr)
        return None

def get_image_quality_score(image_info):
    """Calcule un score de qualité pour une image (pour sélectionner la meilleure comme couverture)"""
    width = image_info.get('width', 0)
    height = image_info.get('height', 0)
    size = image_info.get('size', 0)

    # Score basé sur la résolution et la taille du fichier
    resolution_score = (width * height) / 1000000  # Score basé sur les mégapixels
    size_score = size / 100000  # Score basé sur la taille en centaines de ko

    # Privilégier les images carrées ou landscape
    aspect_ratio = width / height if height > 0 else 1
    aspect_score = 1 if 0.7 <= aspect_ratio <= 1.5 else 0.5

    total_score = (resolution_score * 0.4) + (size_score * 0.4) + (aspect_score * 0.2)

    return total_score

def select_cover_image(images):
    """Sélectionne la meilleure image comme couverture"""
    if not images:
        return None

    # Calculer le score pour chaque image
    for img in images:
        img['quality_score'] = get_image_quality_score(img)

    # Trier par score de qualité
    sorted_images = sorted(images, key=lambda x: x['quality_score'], reverse=True)

    return sorted_images[0] if sorted_images else None

def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_images.py <chemin_vers_pdf> [repertoire_sortie]", file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None

    if not Path(pdf_path).exists():
        print(f"Fichier non trouvé: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    # Extraire les images
    result = extract_images_from_pdf(pdf_path, output_dir)

    if result.get("error"):
        print(f"Erreur: {result['error']}", file=sys.stderr)
        sys.exit(1)

    # Créer des vignettes pour les images extraites
    for img in result["images"]:
        thumbnail_path = create_thumbnail(img["path"])
        if thumbnail_path:
            img["thumbnail"] = thumbnail_path

    # Sélectionner une image de couverture
    cover_image = select_cover_image(result["images"])
    if cover_image:
        result["cover_image"] = cover_image

    # Retourner le résultat en JSON
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()