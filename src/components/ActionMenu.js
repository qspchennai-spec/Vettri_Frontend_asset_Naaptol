import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ActionMenu.css";

// ── Generic three-dot action menu ───────────────────────────────────────
// Enterprise-grade dropdown: renders into a portal (so it's never clipped
// by a card/table's overflow), measures available viewport space to flip
// up/left as needed, and supports full keyboard navigation. Reusable
// across any page — pass in `items` (array of {label, icon, onClick,
// danger} or {divider:true}).
const MENU_WIDTH = 224;
const MENU_MARGIN = 8;

const DotsIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
  </svg>
);

export default function ActionMenu({ items, open, onToggle, onClose, align = "right", ariaLabel = "More actions", renderTrigger }) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const [coords, setCoords] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const actionableItems = items.filter((it) => it && !it.divider);

  const computePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedHeight = menuRef.current?.offsetHeight || actionableItems.length * 38 + 60;

    const spaceBelow = vh - rect.bottom;
    const openUp = spaceBelow < estimatedHeight + MENU_MARGIN && rect.top > estimatedHeight;

    let top = openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
    top = Math.max(MENU_MARGIN, Math.min(top, vh - MENU_MARGIN));

    let left = align === "right" ? rect.right - MENU_WIDTH : rect.left;
    if (left < MENU_MARGIN) left = rect.left;
    if (left + MENU_WIDTH > vw - MENU_MARGIN) left = vw - MENU_WIDTH - MENU_MARGIN;
    left = Math.max(MENU_MARGIN, left);

    setCoords({ top, left, openUp });
  }, [actionableItems.length, align]);

  useLayoutEffect(() => {
    if (!open) { setCoords(null); return; }
    computePosition();
    const raf = requestAnimationFrame(computePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (menuRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      onClose();
    };
    const handleKey = (e) => { if (e.key === "Escape") { onClose(); triggerRef.current?.focus(); } };
    const handleReposition = () => computePosition();

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open, onClose, computePosition]);

  useEffect(() => {
    if (open) setActiveIndex(0);
    else setActiveIndex(-1);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  const handleTriggerKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) onToggle();
    }
  };

  const handleMenuKeyDown = (e) => {
    const count = actionableItems.length;
    if (!count) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setActiveIndex((i) => (i + 1) % count); break;
      case "ArrowUp":   e.preventDefault(); setActiveIndex((i) => (i - 1 + count) % count); break;
      case "Home":      e.preventDefault(); setActiveIndex(0); break;
      case "End":       e.preventDefault(); setActiveIndex(count - 1); break;
      case "Tab":       onClose(); break;
      default: break;
    }
  };

  itemRefs.current = [];

  const menu = open && coords && createPortal(
    <div
      ref={menuRef}
      className={`gm-action-menu-dropdown ${coords.openUp ? "opens-up" : "opens-down"}`}
      style={{ top: coords.top, left: coords.left, width: MENU_WIDTH }}
      role="menu"
      aria-label={ariaLabel}
      onKeyDown={handleMenuKeyDown}
    >
      {items.filter(Boolean).map((it, i) => {
        if (it.divider) return <div key={`divider-${i}`} className="gm-action-menu-divider" role="separator" />;
        const actionIndex = actionableItems.indexOf(it);
        return (
          <button
            key={it.label}
            ref={(el) => { itemRefs.current[actionIndex] = el; }}
            role="menuitem"
            tabIndex={activeIndex === actionIndex ? 0 : -1}
            className={`gm-action-menu-item${it.danger ? " is-danger" : ""}`}
            onClick={() => { onClose(); it.onClick(); }}
          >
            <span className="gm-action-menu-item-icon">{it.icon}</span>
            <span className="gm-action-menu-item-label">{it.label}</span>
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="gm-action-menu">
      {renderTrigger ? (
        renderTrigger({ ref: triggerRef, onClick: onToggle, onKeyDown: handleTriggerKeyDown, "aria-label": ariaLabel, "aria-haspopup": "menu", "aria-expanded": open })
      ) : (
        <button
          ref={triggerRef}
          className={`gm-action-menu-trigger${open ? " is-active" : ""}`}
          onClick={onToggle}
          onKeyDown={handleTriggerKeyDown}
          title={ariaLabel}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <DotsIcon />
        </button>
      )}
      {menu}
    </div>
  );
}
