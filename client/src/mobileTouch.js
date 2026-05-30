/**
 * Shared mobile touch helpers (joystick math + instant tap wiring).
 * Loaded before main.js; exposes BalathorMobileTouch on globalThis.
 */
(function initBalathorMobileTouch(global) {
  const JOYSTICK_DEAD_ZONE = 0.12;

  function isTouchPointer(pointerType) {
    return pointerType === "touch" || pointerType === "pen";
  }

  function clampKnobOffset(px, py, maxDist) {
    const dist = Math.hypot(px, py);
    if (dist > maxDist && dist > 0) {
      return { knobX: (px / dist) * maxDist, knobY: (py / dist) * maxDist };
    }
    return { knobX: px, knobY: py };
  }

  function joystickDirectionsFromKnob(knobX, knobY, maxDist, deadZone = JOYSTICK_DEAD_ZONE) {
    const normX = knobX / maxDist;
    const normY = knobY / maxDist;
    return {
      left: normX < -deadZone,
      right: normX > deadZone,
      up: normY < -deadZone,
      down: normY > deadZone
    };
  }

  function touchWithIdentifier(touches, identifier) {
    if (!touches?.length) {
      return null;
    }
    if (identifier === null || identifier === undefined) {
      return touches[0];
    }
    for (const touch of touches) {
      if (touch.identifier === identifier) {
        return touch;
      }
    }
    return null;
  }

  function pointerPoint(event, touchIdentifier = null) {
    const touch =
      touchWithIdentifier(event.touches, touchIdentifier) ??
      touchWithIdentifier(event.changedTouches, touchIdentifier);
    if (touch) {
      return { clientX: touch.clientX, clientY: touch.clientY };
    }
    return { clientX: event.clientX, clientY: event.clientY };
  }

  function isMobileHudTarget(target) {
    if (!target?.closest) {
      return false;
    }
    return Boolean(
      target.closest(
        "#joystick, #mobileControls, #mobileContextDock, .mobile-context-dock, .ability-bar, .progression, .chat, .party-panel"
      )
    );
  }

  /**
   * Wire a joystick surface to one drag session at a time. Pointer events are
   * the primary path on modern mobile browsers; legacy touch events remain as
   * a fallback for older WebViews that do not emit pointer events.
   */
  function wireJoystickDragSurface(surface, eventTarget, { canStart = () => true, onDrag, onEnd } = {}) {
    if (!surface || !eventTarget || typeof onDrag !== "function") {
      return null;
    }

    let activeInputMode = null;
    let activePointerId = null;
    let activeTouchIdentifier = null;

    function preventBrowserGesture(event) {
      event?.preventDefault?.();
      event?.stopPropagation?.();
    }

    function finishDrag(event) {
      preventBrowserGesture(event);
      activeInputMode = null;
      activePointerId = null;
      activeTouchIdentifier = null;
      onEnd?.(event);
    }

    surface.addEventListener("pointerdown", (event) => {
      if (!canStart(event) || activeInputMode) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      preventBrowserGesture(event);
      activeInputMode = "pointer";
      activePointerId = event.pointerId;
      onDrag(pointerPoint(event), event);
    }, { passive: false });

    eventTarget.addEventListener("pointermove", (event) => {
      if (activeInputMode !== "pointer" || activePointerId !== event.pointerId) return;
      preventBrowserGesture(event);
      onDrag(pointerPoint(event), event);
    }, { passive: false });

    eventTarget.addEventListener("pointerup", (event) => {
      if (activeInputMode !== "pointer" || activePointerId !== event.pointerId) return;
      finishDrag(event);
    }, { passive: false });

    eventTarget.addEventListener("pointercancel", (event) => {
      if (activeInputMode !== "pointer" || activePointerId !== event.pointerId) return;
      finishDrag(event);
    }, { passive: false });

    surface.addEventListener("touchstart", (event) => {
      if (!canStart(event) || activeInputMode) return;
      const firstTouch = touchWithIdentifier(event.changedTouches, null);
      if (!firstTouch) return;
      preventBrowserGesture(event);
      activeInputMode = "touch";
      activeTouchIdentifier = firstTouch.identifier;
      onDrag(pointerPoint(event, activeTouchIdentifier), event);
    }, { passive: false });

    eventTarget.addEventListener("touchmove", (event) => {
      if (activeInputMode !== "touch") return;
      const activeTouch = touchWithIdentifier(event.touches, activeTouchIdentifier);
      if (!activeTouch) return;
      preventBrowserGesture(event);
      onDrag(pointerPoint(event, activeTouchIdentifier), event);
    }, { passive: false });

    eventTarget.addEventListener("touchend", (event) => {
      if (activeInputMode !== "touch") return;
      if (!touchWithIdentifier(event.changedTouches, activeTouchIdentifier)) return;
      finishDrag(event);
    }, { passive: false });

    eventTarget.addEventListener("touchcancel", (event) => {
      if (activeInputMode !== "touch") return;
      if (event?.changedTouches?.length && !touchWithIdentifier(event.changedTouches, activeTouchIdentifier)) return;
      finishDrag(event);
    }, { passive: false });

    return { finishDrag };
  }

  /**
   * Fire handler on pointerdown for touch/pen; mouse uses click.
   */
  function wireInstantTap(el, handler, { hold = false, onHoldChange = null } = {}) {
    if (!el || typeof handler !== "function") {
      return;
    }
    let suppressClickUntil = 0;

    function runTap(event) {
      event?.stopPropagation?.();
      handler(event);
    }

    el.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        if (hold) {
          event.preventDefault();
          event.stopPropagation();
          if (typeof onHoldChange === "function") {
            onHoldChange(true, event);
          } else {
            handler(true, event);
          }
          return;
        }
        if (isTouchPointer(event.pointerType)) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickUntil = performance.now() + 500;
          runTap(event);
        }
      },
      { passive: false }
    );

    el.addEventListener(
      "pointerup",
      (event) => {
        if (!hold) {
          return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (typeof onHoldChange === "function") {
          onHoldChange(false, event);
        } else {
          handler(false, event);
        }
      },
      { passive: false }
    );

    el.addEventListener("pointercancel", () => {
      if (!hold) {
        return;
      }
      if (typeof onHoldChange === "function") {
        onHoldChange(false, null);
      } else {
        handler(false, null);
      }
    });

    el.addEventListener("click", (event) => {
      if (isTouchPointer(event.pointerType)) {
        return;
      }
      if (performance.now() < suppressClickUntil) {
        return;
      }
      if (hold) {
        return;
      }
      runTap(event);
    });
  }

  global.BalathorMobileTouch = {
    JOYSTICK_DEAD_ZONE,
    isTouchPointer,
    clampKnobOffset,
    joystickDirectionsFromKnob,
    touchWithIdentifier,
    pointerPoint,
    isMobileHudTarget,
    wireJoystickDragSurface,
    wireInstantTap
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
