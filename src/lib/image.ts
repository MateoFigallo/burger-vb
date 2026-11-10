const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Achica una foto subida y la convierte en data URL (JPEG) para guardarla en el navegador.
 * Lanza un error con un mensaje para mostrar si el archivo no sirve.
 */
export async function resizeImageFile(file: File, maxSize = 900, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo tiene que ser una imagen (JPG, PNG o WebP).");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("La imagen pesa más de 10 MB. Probá con una más liviana.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo procesar la imagen.");

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
