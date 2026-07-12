import type { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Show decorative screw hardware details in corners. */
  bolted?: boolean;
}

export function Card({ bolted = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={clsx(
        'card-bolted rounded-2xl bg-chassis p-6 relative',
        className,
      )}
      {...rest}
    >
      {bolted && (
        <>
          <span className="screw top-3 left-3 opacity-40" />
          <span className="screw top-3 right-3 opacity-40" />
          <span className="screw bottom-3 left-3 opacity-40" />
          <span className="screw bottom-3 right-3 opacity-40" />
        </>
      )}
      {children}
    </div>
  );
}
