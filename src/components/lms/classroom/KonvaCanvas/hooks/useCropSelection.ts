import { useCallback } from 'react';
import type { CanvasElement } from '../utils/types';

interface CropApi {
  enter: (el: CanvasElement) => void;
}

export function useCropSelection(selectedImage: CanvasElement | null, crop: CropApi) {
  const handleCropImageClick = useCallback(() => {
    if (selectedImage) crop.enter(selectedImage);
  }, [selectedImage, crop]);

  const cropSelectedImage = useCallback(() => {
    if (selectedImage) crop.enter(selectedImage);
  }, [selectedImage, crop]);

  return { handleCropImageClick, cropSelectedImage };
}
