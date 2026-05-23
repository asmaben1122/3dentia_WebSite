import os
from PIL import Image, ImageOps, ImageEnhance
from app.utils.logger import logger

def preprocess_dental_panoramic(image_path: str, target_size=(512, 1024)) -> str:
    """Preprocesses a raw 2D panoramic dental X-Ray image.
    Enhances contrast, normalizes lighting, and resizes it for deep learning PyTorch encoder.
    
    Args:
        image_path (str): Filepath of the uploaded dental panoramic image.
        target_size (tuple): Target dimensions (Height, Width) for the neural network.
        
    Returns:
        str: Filepath to the processed image asset.
    """
    logger.info(f"🎨 Preprocessing panoramic dental image: {image_path}")
    
    if not os.path.exists(image_path):
        logger.error(f"Image not found at path: {image_path}")
        return image_path
        
    try:
        # Load dental X-Ray image
        with Image.open(image_path) as img:
            # 1. Convert to Grayscale (Standardizing 1-channel intensity)
            gray_img = ImageOps.grayscale(img)
            
            # 2. Apply Histogram Equalization to normalize bright bone/enamel features vs dark tissues
            equalized_img = ImageOps.equalize(gray_img)
            
            # 3. Enhance high-frequency sharpness for dental root margins
            enhancer = ImageEnhance.Sharpness(equalized_img)
            sharpened_img = enhancer.enhance(1.5)
            
            # 4. Downscale to encoder dimensions
            resized_img = sharpened_img.resize((target_size[1], target_size[0]), Image.Resampling.LANCZOS)
            
            # 5. Save processed image as intermediate
            base, ext = os.path.splitext(image_path)
            processed_path = f"{base}_preprocessed{ext}"
            resized_img.save(processed_path)
            
            logger.info(f"✨ Dental pre-processing complete: Saved to {processed_path}")
            return processed_path
            
    except Exception as e:
        logger.error(f"⚠️ Error during panoramic preprocessing: {e}. Returning original.")
        return image_path
