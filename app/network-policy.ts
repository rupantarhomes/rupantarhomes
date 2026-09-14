type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
};

type NetworkNavigator = Navigator & {
  connection?: NetworkConnection;
  mozConnection?: NetworkConnection;
  webkitConnection?: NetworkConnection;
};

export type NetworkProfile = {
  saveData: boolean;
  effectiveType: string;
  constrained: boolean;
  slow: boolean;
};

function connection(): NetworkConnection | undefined {
  if (typeof navigator === "undefined") return undefined;
  const networkNavigator = navigator as NetworkNavigator;
  return networkNavigator.connection ?? networkNavigator.mozConnection ?? networkNavigator.webkitConnection;
}

export function readNetworkProfile(): NetworkProfile {
  const current = connection();
  const effectiveType = String(current?.effectiveType ?? "").toLowerCase();
  const saveData = current?.saveData === true;
  const constrained = saveData || effectiveType === "slow-2g" || effectiveType === "2g";
  const unknownMobile = !effectiveType && typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const slow = constrained || effectiveType === "3g" || unknownMobile
    || (typeof current?.downlink === "number" && current.downlink > 0 && current.downlink < 1.5);
  return { saveData, effectiveType, constrained, slow };
}

export function shouldWarmPublicRoutes(): boolean {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  return !readNetworkProfile().slow;
}

export function shouldPrefetchOptionalMedia(): boolean {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  return !readNetworkProfile().constrained;
}

export function heroPreloadDelayMs(): number {
  const profile = readNetworkProfile();
  if (profile.constrained) return 12_000;
  return profile.slow ? 6_000 : 1_800;
}

export function homeCoverPreloadCount(): number {
  const profile = readNetworkProfile();
  if (profile.constrained) return 0;
  if (profile.slow) return 1;
  if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return 3;
  return 2;
}
