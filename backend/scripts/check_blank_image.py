#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
from PIL import Image
import numpy as np

def is_blank_image(image_path, threshold=0.95, min_width=400, min_height=300):
    """
    Vérifie si une image est blanche/uniforme ou trop petite (logo)
    threshold: pourcentage de pixels similaires pour considérer l'image comme blanche (0.95 = 95%)
    min_width: largeur minimale pour une image de cover (évite les logos)
    min_height: hauteur minimale pour une image de cover (évite les logos)
    """
    try:
        img = Image.open(image_path)

        # Vérifier la taille de l'image (filtrer les logos qui sont souvent petits)
        width, height = img.size
        if width < min_width or height < min_height:
            print(f"SMALL_LOGO:{width}x{height}")
            return True

        # Convertir en niveaux de gris pour simplifier
        img_gray = img.convert('L')

        # Convertir en array numpy
        img_array = np.array(img_gray)

        # Calculer la variance (mesure de la dispersion des pixels)
        # Une variance faible = image uniforme
        variance = np.var(img_array)

        # Une variance < 100 indique généralement une image très uniforme
        if variance < 100:
            print(f"BLANK:{variance}")
            return True

        # Vérifier si la plupart des pixels sont blancs (> 240)
        white_pixels = np.sum(img_array > 240)
        total_pixels = img_array.size
        white_ratio = white_pixels / total_pixels

        if white_ratio > threshold:
            print(f"BLANK:{white_ratio}")
            return True

        print(f"OK:{width}x{height}:{variance}:{white_ratio}")
        return False

    except Exception as e:
        print(f"ERROR:{str(e)}")
        return False

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("ERROR:No image path provided")
        sys.exit(1)

    image_path = sys.argv[1]
    is_blank = is_blank_image(image_path)
    sys.exit(0 if is_blank else 1)
