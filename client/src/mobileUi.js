/**
 * Mobile layout: context-aware action dock, collapsible ability bar, sheet-style windows.
 * Loaded after main.js; patches a few globals and wires touch controls.
 */
(function initBalathorMobileUi() {
  if (typeof isMobile === "undefined" || !isMobile) {
    return;
  }

  const mobileContextDock = document.querySelector("#mobileContextDock");
  const mobilePrimaryAction = document.querySelector("#mobilePrimaryAction");
  const mobileContextActions = document.querySelector("#mobileContextActions");
  const mobileHotbarExpand = document.querySelector("#mobileHotbarExpand");
  const mobileWindowBackdrop = document.querySelector("#mobileWindowBackdrop");

  const MOBILE_GAME_WINDOW_PANELS = [
    document.querySelector("#equipmentPanel"),
    document.querySelector("#bagsPanel"),
    document.querySelector("#questPanel"),
    document.querySelector("#talentPanel"),
    document.querySelector("#shopPanel"),
    document.querySelector("#traderPanel"),
    document.querySelector("#buyHousePanel"),
    document.querySelector("#companionOfferPanel"),
    document.querySelector("#teleportMenuPanel"),
    document.querySelector("#questOfferPanel"),
    document.querySelector("#shipTerminalPanel"),
    document.querySelector("#tradePanel"),
    document.querySelector("#friendsWindow")
  ].filter(Boolean);

  if (!mobileContextDock || !mobilePrimaryAction) {
    return;
  }

  state.mobileHotbarExpanded = false;
  state._mobileDockAt = 0;
  state._mobileUiBooted = false;

  let mobileChipSignature = "";
  let mobilePrimarySignature = "";

  function mobileChipSignatureFor(chips) {
    return chips.map((chip) => `${chip.id}:${chip.label}:${chip.selected ? "1" : "0"}`).join("|");
  }

  function wireMobileButton(el, handler, { hold = false } = {}) {
    if (!el || typeof handler !== "function") {
      return;
    }
    let suppressClickUntil = 0;

    function runTap(event) {
      event.stopPropagation();
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
          handler(true, event);
          return;
        }
        if (event.pointerType === "touch" || event.pointerType === "pen") {
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
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        if (hold) {
          handler(false, event);
        }
      },
      { passive: true }
    );

    el.addEventListener("pointercancel", () => {
      if (hold) {
        handler(false, null);
      }
    });

    el.addEventListener("click", (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        return;
      }
      if (performance.now() < suppressClickUntil) {
        return;
      }
      runTap(event);
    });
  }

  function setMobileHotbarExpanded(expanded) {
    state.mobileHotbarExpanded = Boolean(expanded);
    document.body.classList.toggle("mobile-hotbar-expanded", expanded);
    document.body.classList.toggle("mobile-hotbar-collapsed", !expanded);
    abilityBar.classList.toggle("minimized", !expanded);
    abilityBarToggle.textContent = expanded ? "\u2212" : "+";
    abilityBarToggle.title = expanded ? "Hide spell bar" : "Show spell bar";
    if (mobileHotbarExpand) {
      mobileHotbarExpand.setAttribute("aria-expanded", String(expanded));
      mobileHotbarExpand.textContent = expanded ? "Hide" : "Spells";
    }
    const selfMid = state.players.get(state.selfId);
    syncSafeZoneIndicator(selfMid);
    syncHomeTeleportSlot(selfMid);
  }

  function isMobileGameSheetOpen() {
    if (state.shop?.open) return true;
    if (state.teleportMenu?.open) return true;
    for (const panel of MOBILE_GAME_WINDOW_PANELS) {
      if (!panel.classList.contains("hidden")) return true;
    }
    return false;
  }

  function syncMobileGameWindowLayer() {
    const open = isMobileGameSheetOpen();
    mobileWindowBackdrop?.classList.toggle("hidden", !open);
    mobileWindowBackdrop?.setAttribute("aria-hidden", open ? "false" : "true");
    document.body.classList.toggle("mobile-sheet-open", open);
  }

  function getMobileInteractContext() {
    const self = state.players.get(state.selfId);
    if (!self) return null;
    const px = Number.isFinite(self.renderX) ? self.renderX : self.x;
    const py = Number.isFinite(self.renderY) ? self.renderY : self.y;
    const nearbyChests = state.chests.filter(
      (chest) => !chest.opened && Math.hypot(chest.x - px, chest.y - py) <= 2.2
    );
    if (nearbyChests.length) return { label: "Open" };
    const nearbyItems = state.groundItems.filter(
      (ground) => Math.hypot(ground.x - px, ground.y - py) <= 2.2
    );
    if (nearbyItems.length) return { label: "Pick up" };
    for (const building of state.buildings.values()) {
      if (!building.forSale) continue;
      if (playerCanInteractBuyHouse(px, py, building)) {
        return { label: "Buy" };
      }
    }
    return null;
  }

  function getMobilePrimaryActionSpec() {
    const shipMode = isSelfOnShip();
    const interact = getMobileInteractContext();
    if (shipMode) {
      const role = selfShipStationRole();
      if (!role) {
        return { label: "Dock", action: "interact", hold: false };
      }
      if (role === "gunner") {
        return { label: "Fire", action: "ship-station", hold: true };
      }
      if (role === "engineer") {
        return { label: "Repair", action: "ship-station", hold: true };
      }
      return {
        label: isPilotShipRole(role) || !state.players.get(state.selfId)?.ship?.deckMode ? "Engage" : "Station",
        action: "ship-station",
        hold: true
      };
    }
    if (interact) {
      return { label: interact.label, action: "interact", hold: false };
    }
    return { label: "Attack", action: "attack", hold: false };
  }

  function syncMobileContextChips(chips) {
    const signature = mobileChipSignatureFor(chips);
    if (signature === mobileChipSignature) {
      return;
    }
    mobileChipSignature = signature;
    mobileContextActions.replaceChildren();
    for (const chip of chips) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "mobile-context-chip";
      btn.dataset.contextAction = chip.id;
      btn.textContent = chip.label;
      btn.title = chip.title || chip.label;
      if (chip.selected) btn.classList.add("selected");
      mobileContextActions.append(btn);
    }
  }

  function renderMobileContextDock() {
    if (!state.joined || state.menuOpen) {
      mobileContextDock.classList.add("hidden");
      mobileChipSignature = "";
      mobilePrimarySignature = "";
      return;
    }
    mobileContextDock.classList.remove("hidden");
    const self = state.players.get(state.selfId);
    const primary = getMobilePrimaryActionSpec();
    const primarySignature = `${primary.label}:${primary.action}:${primary.hold ? "1" : "0"}`;
    if (primarySignature !== mobilePrimarySignature) {
      mobilePrimarySignature = primarySignature;
      const primaryLabel = mobilePrimaryAction.querySelector(".mobile-primary-label");
      if (primaryLabel) primaryLabel.textContent = primary.label;
      else mobilePrimaryAction.textContent = primary.label;
      mobilePrimaryAction.dataset.action = primary.action;
      mobilePrimaryAction.dataset.hold = primary.hold ? "1" : "0";
    }

    const chips = [];
    const potionCount = Number(self?.potionCount) || 0;
    if (potionCount > 0 && !isSelfOnShip()) {
      chips.push({ id: "potion", label: `Pot ${potionCount}`, title: "Health potion" });
    }
    if (isSciFiWorld() || isPlanetSurfaceWorld()) {
      const shipFlight = isSelfFlyingShip();
      const planetSurface = isPlanetSurfaceWorld();
      chips.push({
        id: "teleport",
        label: planetSurface ? "Ship" : shipFlight ? "Warp" : "TP",
        title: planetSurface ? "Return to ship" : shipFlight ? "Warp drive" : "Teleport"
      });
    }
    if (self?.homeBuildingKey) {
      chips.push({ id: "home", label: "Home", title: "Teleport home" });
    }
    const interact = getMobileInteractContext();
    if (interact && primary.action !== "interact") {
      chips.push({ id: "interact", label: interact.label, title: "Interact nearby" });
    }
    if (state.shop?.open) {
      chips.push({ id: "shop", label: "Shop", title: "Trader shelf", selected: true });
    }
    chips.push(
      { id: "character", label: "Char", title: "Character", selected: state.activeWindow === "equipment" },
      { id: "bags", label: "Bags", title: "Inventory", selected: state.activeWindow === "bags" },
      { id: "quests", label: "Quest", title: "Quest log", selected: state.activeWindow === "quests" }
    );

    syncMobileContextChips(chips);
  }

  function handleMobileContextAction(actionId) {
    if (!state.joined || state.menuOpen) return;
    switch (actionId) {
      case "potion":
        usePotionOrShipExit();
        break;
      case "teleport":
        if (isPlanetSurfaceWorld()) {
          send({ type: "returnToShip" });
        } else {
          send({ type: "teleportMenuOpen", fromFlight: isSelfFlyingShip() });
        }
        break;
      case "home":
        sendHome();
        break;
      case "interact": {
        const self = state.players.get(state.selfId);
        if (!self || !tryOpenBuyHouseNearPlayer()) sendInteract();
        break;
      }
      case "shop":
        shopPanel?.classList.remove("hidden");
        syncMobileGameWindowLayer();
        break;
      case "character":
        toggleGameWindow("equipment");
        break;
      case "bags":
        toggleGameWindow("bags");
        break;
      case "quests":
        toggleGameWindow("quests");
        break;
      case "toggle-hotbar":
        setMobileHotbarExpanded(!state.mobileHotbarExpanded);
        break;
      default:
        break;
    }
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  }

  function closeAllMobileSheets() {
    closeShop();
    closeTeleportMenu();
    setActiveGameWindow(null);
    document.querySelector("#buyHousePanel")?.classList.add("hidden");
    document.querySelector("#companionOfferPanel")?.classList.add("hidden");
    document.querySelector("#questOfferPanel")?.classList.add("hidden");
    document.querySelector("#shipTerminalPanel")?.classList.add("hidden");
    document.querySelector("#tradePanel")?.classList.add("hidden");
    document.querySelector("#friendsWindow")?.classList.add("hidden");
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  }

  function wireMobileContextDock() {
    function activateContextChip(event) {
      const chip = event.target.closest("[data-context-action]");
      if (!chip || !mobileContextActions.contains(chip)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      handleMobileContextAction(chip.dataset.contextAction);
    }

    mobileContextActions.addEventListener(
      "pointerdown",
      (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) {
          return;
        }
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          activateContextChip(event);
        }
      },
      { passive: false }
    );

    mobileContextActions.addEventListener("click", (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") {
        return;
      }
      activateContextChip(event);
    });

    wireMobileButton(mobileHotbarExpand, () => {
      setMobileHotbarExpanded(!state.mobileHotbarExpanded);
      renderMobileContextDock();
    });

    mobileWindowBackdrop?.addEventListener("click", closeAllMobileSheets);

    let mobileShipHoldActive = false;
    let primaryPointerDown = false;

    function setMobileShipStationHold(active, event) {
      if (!state.joined || state.menuOpen || !isSelfOnShip()) return;
      if (event) event.stopPropagation();
      const role = selfShipStationRole();
      if (!role) {
        if (active) sendInteract();
        return;
      }
      state.input.engage = Boolean(active && isPilotShipRole(role));
      state.input.fire = Boolean(active && role === "gunner");
      state.input.repair = Boolean(active && role === "engineer");
      sendInput();
      mobileShipHoldActive = active;
    }

    function runMobilePrimaryTap() {
      if (!state.joined || state.menuOpen) return;
      const action = mobilePrimaryAction.dataset.action || "attack";
      if (action === "interact") {
        const self = state.players.get(state.selfId);
        if (!self || !tryOpenBuyHouseNearPlayer()) sendInteract();
        return;
      }
      if (action === "attack" && !playerAttackBlockedBySafeZone()) {
        sendAttack();
      }
    }

    mobilePrimaryAction.addEventListener(
      "pointerdown",
      (event) => {
        if (!state.joined || state.menuOpen) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        primaryPointerDown = true;
        if (mobilePrimaryAction.dataset.hold === "1") {
          event.preventDefault();
          event.stopPropagation();
          setMobileShipStationHold(true, event);
          return;
        }
        if (event.pointerType === "touch" || event.pointerType === "pen") {
          event.preventDefault();
          event.stopPropagation();
          runMobilePrimaryTap();
          primaryPointerDown = false;
        }
      },
      { passive: false }
    );

    mobilePrimaryAction.addEventListener(
      "pointerup",
      (event) => {
        if (!primaryPointerDown) return;
        primaryPointerDown = false;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (mobilePrimaryAction.dataset.hold === "1") {
          setMobileShipStationHold(false, event);
          return;
        }
        event.stopPropagation();
        runMobilePrimaryTap();
      },
      { passive: true }
    );

    mobilePrimaryAction.addEventListener("pointercancel", () => {
      primaryPointerDown = false;
      if (mobileShipHoldActive) setMobileShipStationHold(false, null);
    });

    mobilePrimaryAction.addEventListener("click", (event) => {
      if (event.pointerType === "touch" || event.pointerType === "pen") return;
      if (mobilePrimaryAction.dataset.hold === "1") return;
      runMobilePrimaryTap();
    });
  }

  function bootMobileSession() {
    if (state._mobileUiBooted || !state.joined) return;
    state._mobileUiBooted = true;
    setChatMinimized(true);
    setProgressionMinimized(true);
    setMobileHotbarExpanded(false);
    syncMobileControlsVisibility();
    renderMobileContextDock();
    syncMobileGameWindowLayer();
  }

  const _renderAbilityBar = renderAbilityBar;
  renderAbilityBar = function renderAbilityBarMobile() {
    _renderAbilityBar();
    renderMobileContextDock();
  };

  const _setActiveGameWindow = setActiveGameWindow;
  setActiveGameWindow = function setActiveGameWindowMobile(name) {
    _setActiveGameWindow(name);
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  };

  const _renderShop = renderShop;
  renderShop = function renderShopMobile() {
    _renderShop();
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  };

  const _closeShop = closeShop;
  closeShop = function closeShopMobile() {
    _closeShop();
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  };

  const _closeTeleportMenu = closeTeleportMenu;
  closeTeleportMenu = function closeTeleportMenuMobile() {
    _closeTeleportMenu();
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  };

  const _showTeleportMenu = showTeleportMenu;
  showTeleportMenu = function showTeleportMenuMobile(payload) {
    _showTeleportMenu(payload);
    syncMobileGameWindowLayer();
    renderMobileContextDock();
  };

  const _renderNearbyLoot = renderNearbyLoot;
  renderNearbyLoot = function renderNearbyLootMobile() {
    _renderNearbyLoot();
    renderMobileContextDock();
  };

  const _renderProgression = renderProgression;
  renderProgression = function renderProgressionMobile(self) {
    _renderProgression(self);
    bootMobileSession();
  };

  const _frame = frame;
  frame = function frameMobile(now) {
    _frame(now);
    if (state.joined && now - state._mobileDockAt > 750) {
      state._mobileDockAt = now;
      renderMobileContextDock();
    }
  };

  const _makeDraggable = makeDraggable;
  makeDraggable = function makeDraggableMobile(panel) {
    if (panel?.id === "partyPanel") {
      _makeDraggable(panel);
    }
  };

  if (partyPanel) {
    _makeDraggable(partyPanel);
    restorePartyPanelPosition();
  }

  abilityBarToggle.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.pointerType === "touch" || event.pointerType === "pen")) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      setMobileHotbarExpanded(!state.mobileHotbarExpanded);
      renderMobileContextDock();
    },
    true
  );

  abilityBarToggle.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    setMobileHotbarExpanded(!state.mobileHotbarExpanded);
    renderMobileContextDock();
  }, true);

  const _resetToConnection = resetToConnection;
  resetToConnection = function resetToConnectionMobile(message, opts) {
    state._mobileUiBooted = false;
    state.mobileHotbarExpanded = false;
    mobileChipSignature = "";
    mobilePrimarySignature = "";
    mobileContextDock.classList.add("hidden");
    document.body.classList.remove("mobile-hotbar-expanded", "mobile-hotbar-collapsed", "mobile-sheet-open", "in-game");
    _resetToConnection(message, opts);
    syncMobileControlsVisibility();
    syncMobileGameWindowLayer();
  };

  wireMobileContextDock();
  document.body.classList.add("mobile-hotbar-collapsed");
})();
