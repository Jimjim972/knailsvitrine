import type { ReactNode } from "react";

type PageHeadingProps = {
  title: string;
  children: ReactNode;
};

export function PageHeading({ title, children }: PageHeadingProps) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      <p>{children}</p>
    </header>
  );
}
