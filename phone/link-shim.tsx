import type { AnchorHTMLAttributes } from "react";
import { navigate } from "./router";

/** Stands in for next/link: internal links switch views instead of loading a URL */
export default function Link({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        if (href.startsWith("/")) {
          e.preventDefault();
          navigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}
