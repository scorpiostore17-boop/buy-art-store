import { useCallback, useEffect, useMemo, useState } from 'react';
import { colorsOf, findVariant, sizesOf } from '../utils/product';

/** Shared size/color selection logic used by the product page and the card quick-add. */
export default function useVariantSelection(product) {
  const colors = useMemo(() => colorsOf(product), [product]);
  const sizes = useMemo(() => sizesOf(product), [product]);
  const variants = product.variants || [];

  const initialColor = () => {
    if (!colors.length) return '';
    const firstInStock = variants.find((v) => v.stock > 0 && v.color_name);
    return firstInStock ? firstInStock.color_name : colors[0].name;
  };
  const initialSize = () => (sizes.length === 1 ? sizes[0] : '');

  const [color, setColorState] = useState(initialColor);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    setColorState(initialColor());
    setSize(initialSize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const setColor = useCallback(
    (name) => {
      setColorState(name);
      // drop the chosen size if it is not available in the new color
      setSize((s) =>
        s && variants.some((v) => v.color_name === name && v.size === s && v.stock > 0) ? s : sizes.length === 1 ? sizes[0] : '',
      );
    },
    [variants, sizes],
  );

  const sizeAvailable = (s) => variants.some((v) => v.size === s && v.stock > 0 && (!color || v.color_name === color));
  const colorAvailable = (name) => variants.some((v) => v.color_name === name && v.stock > 0);

  const variant = size ? findVariant(product, size, color) : undefined;
  return { colors, sizes, color, size, setColor, setSize, variant, sizeAvailable, colorAvailable };
}
