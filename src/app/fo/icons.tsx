type IconProps = {
  size?: number;
  className?: string;
  pathClassName?: string;
};

export function UmbrellaIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M24 5 V9" />
      <path d="M6 24 A18 18 0 0 1 42 24" />
      <path d="M6 24 q4.5 -7 9 0 t9 0 t9 0 t9 0" />
      <path d="M24 9 V37 a4.5 4.5 0 0 1 -9 0" />
    </svg>
  );
}

export function CheckIcon({ size = 24, className, pathClassName }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path className={pathClassName} d="M5 13 l4 4 L19 7" />
    </svg>
  );
}
