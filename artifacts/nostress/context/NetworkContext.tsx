/**
 * NetworkContext — détection de la qualité réseau et mode Économie de données.
 *
 * États gérés :
 *   - isOnline        : connexion internet disponible
 *   - isSlowConnection: connexion cellulaire 2G/3G ou réponse instable
 *   - isLowDataMode   : activé si mode==="on", ou mode==="auto" && connexion lente
 *   - dataSaverMode   : "auto" | "on" | "off" — persisté dans AsyncStorage
 *   - networkMessage  : message destiné à OfflineBanner
 *
 * Stratégie anti-fluctuation : debounce de 3 s avant de changer d'état.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────────────────────

export type DataSaverMode = "auto" | "on" | "off";

export type NetworkMessage =
  | "offline"
  | "slow_auto"
  | "reconnected"
  | null;

interface NetworkContextValue {
  isOnline: boolean;
  isSlowConnection: boolean;
  /** Mode économique effectif (tient compte de isSlowConnection si "auto") */
  isLowDataMode: boolean;
  dataSaverMode: DataSaverMode;
  setDataSaverMode: (m: DataSaverMode) => void;
  /** Message actuel à afficher dans la bannière */
  networkMessage: NetworkMessage;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  isSlowConnection: false,
  isLowDataMode: false,
  dataSaverMode: "auto",
  setDataSaverMode: () => {},
  networkMessage: null,
});

// ── Clé de persistance ────────────────────────────────────────────────────────
const STORAGE_KEY = "ns_data_saver_mode";

// ── Utilitaires ───────────────────────────────────────────────────────────────

function isOnlineFromState(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

function isSlowFromState(state: NetInfoState): boolean {
  if (!isOnlineFromState(state)) return false;
  // Types cellulaires lents
  const type = state.type;
  if (type === "none" || type === "unknown") return true;
  // effectiveType sur Android/iOS
  const details = state.details as any;
  const effectiveType = details?.cellularGeneration ?? null;
  if (effectiveType === "2g" || effectiveType === "3g") return true;
  // Type cellulaire sans info de génération → considéré potentiellement lent
  if (type === "cellular" && !effectiveType) return true;
  return false;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [dataSaverMode, setDataSaverModeState] = useState<DataSaverMode>("auto");
  const [isOnline, setIsOnline] = useState(true);
  const [isSlowConnection, setIsSlowConnection] = useState(false);
  const [networkMessage, setNetworkMessage] = useState<NetworkMessage>(null);

  // Timer pour le debounce anti-fluctuation
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Timer pour auto-cacher le message "Connexion rétablie"
  const reconnectedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref pour savoir si on était hors ligne
  const wasOfflineRef = useRef(false);
  const wasSlowRef = useRef(false);

  // ── Charger le réglage persisté ─────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "auto" || val === "on" || val === "off") {
        setDataSaverModeState(val);
      }
    });
  }, []);

  const setDataSaverMode = useCallback((mode: DataSaverMode) => {
    setDataSaverModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  // ── Écoute NetInfo avec debounce ─────────────────────────────────────────
  useEffect(() => {
    const applyState = (state: NetInfoState) => {
      const online = isOnlineFromState(state);
      const slow   = isSlowFromState(state);

      setIsOnline(online);
      setIsSlowConnection(slow);

      if (!online && !wasOfflineRef.current) {
        // Vient de passer hors-ligne
        wasOfflineRef.current = true;
        setNetworkMessage("offline");
        if (reconnectedTimer.current) clearTimeout(reconnectedTimer.current);
      } else if (online && wasOfflineRef.current) {
        // Retour en ligne
        wasOfflineRef.current = false;
        setNetworkMessage("reconnected");
        reconnectedTimer.current = setTimeout(() => setNetworkMessage(null), 3500);
      } else if (online && slow && !wasSlowRef.current && !wasOfflineRef.current) {
        // Connexion lente détectée (seulement en mode auto)
        wasSlowRef.current = true;
        setNetworkMessage("slow_auto");
      } else if (online && !slow && wasSlowRef.current) {
        // Connexion redevenue rapide
        wasSlowRef.current = false;
        setNetworkMessage(null);
      }
    };

    const debouncedApply = (state: NetInfoState) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => applyState(state), 3000);
    };

    // Fetch initial (immédiat, sans debounce)
    NetInfo.fetch().then(applyState);

    const unsubscribe = NetInfo.addEventListener(debouncedApply);

    return () => {
      unsubscribe();
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (reconnectedTimer.current) clearTimeout(reconnectedTimer.current);
    };
  }, []);

  // ── Calcul du mode économique effectif ───────────────────────────────────
  const isLowDataMode =
    dataSaverMode === "on" ||
    (dataSaverMode === "auto" && isSlowConnection);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSlowConnection,
        isLowDataMode,
        dataSaverMode,
        setDataSaverMode,
        networkMessage,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNetwork(): NetworkContextValue {
  return useContext(NetworkContext);
}

export function useLowDataMode(): boolean {
  return useContext(NetworkContext).isLowDataMode;
}
