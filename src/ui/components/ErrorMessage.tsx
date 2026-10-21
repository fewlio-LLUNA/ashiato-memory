import type { ReactElement } from 'react';
import { AlertIcon } from '../icons';

interface ErrorMessageProps {
  message: string | null;
}

/** DomainError の message をそのまま表示する。 */
export function ErrorMessage({ message }: ErrorMessageProps): ReactElement | null {
  if (message === null) return null;
  return (
    <p className="message--error" role="alert">
      <AlertIcon size={18} /> {message}
    </p>
  );
}
