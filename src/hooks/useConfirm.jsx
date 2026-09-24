import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

/**  const [confirm, dialog] = useConfirm();
 *   if (await confirm({ title, message })) { ... }   // render {dialog} somewhere in the JSX
 */
export default function useConfirm() {
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );
  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = opts ? (
    <ConfirmDialog {...opts} onConfirm={() => close(true)} onCancel={() => close(false)} />
  ) : null;
  return [confirm, dialog];
}
