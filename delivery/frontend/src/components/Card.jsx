import React from "react";

/**
 * Shared surface used for every panel in the app (stat tiles, tables,
 * insight tiles, dialogs). Centralizing it here is what makes the dark
 * theme toggle in the topbar actually consistent across pages.
 */
export default function Card({ as: Tag = "div", className = "", children, ...rest }) {
  return (
    <Tag
      className={[
        "bg-white dark:bg-[#1B1830] border border-border dark:border-white/10 rounded-xl2 shadow-card dark:shadow-none",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </Tag>
  );
}
