"use client";

import * as MapLibreGL from "maplibre-gl";
import type { MarkerOptions, PopupOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

// Site is light-only (global.css forces `color-scheme: light`), so the map
// defaults to the light CARTO basemap. Pass `theme="dark"` explicitly if a
// dark surface ever needs one — no document/system sniffing, no observers.
const LIGHT_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

type Theme = "light" | "dark";

type MapViewport = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type MapStyleOption = string | MapLibreGL.StyleSpecification;
type MapRef = MapLibreGL.Map;

type MapContextValue = {
  map: MapLibreGL.Map | null;
  isLoaded: boolean;
};

const MapContext = createContext<MapContextValue | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) throw new Error("useMap must be used within a Map component");
  return context;
}

type MapProps = {
  children?: ReactNode;
  className?: string;
  theme?: Theme;
  styles?: { light?: MapStyleOption; dark?: MapStyleOption };
  viewport?: Partial<MapViewport>;
  onViewportChange?: (viewport: MapViewport) => void;
  loading?: boolean;
} & Omit<MapLibreGL.MapOptions, "container" | "style">;

function DefaultLoader() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-canvas/60">
      <div className="flex gap-1" aria-hidden="true">
        <span className="size-1.5 animate-pulse rounded-full bg-ink/40" />
        <span className="size-1.5 animate-pulse rounded-full bg-ink/40 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-ink/40 [animation-delay:300ms]" />
      </div>
      <span className="sr-only">Loading map…</span>
    </div>
  );
}

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme = "light",
    styles,
    viewport,
    onViewportChange,
    loading = false,
    ...props
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? DARK_STYLE,
      light: styles?.light ?? LIGHT_STYLE,
    }),
    [styles],
  );

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance]);

  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
      styleTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: theme === "dark" ? mapStyles.dark : mapStyles.light,
      renderWorldCopies: false,
      attributionControl: { compact: true },
      // Hero-embedded maps must not trap page scroll.
      scrollZoom: false,
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      styleTimeoutRef.current = setTimeout(() => setIsStyleLoaded(true), 100);
    };
    const loadHandler = () => setIsLoaded(true);
    const moveHandler = () => {
      if (!internalUpdateRef.current)
        onViewportChangeRef.current?.(getViewport(map));
    };

    map.on("load", loadHandler);
    map.on("styledata", styleDataHandler);
    map.on("move", moveHandler);
    setMapInstance(map);

    return () => {
      clearStyleTimeout();
      map.off("load", loadHandler);
      map.off("styledata", styleDataHandler);
      map.off("move", moveHandler);
      map.remove();
      setMapInstance(null);
      setIsLoaded(false);
      setIsStyleLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapInstance) return;
    const nextStyle = theme === "dark" ? mapStyles.dark : mapStyles.light;
    setIsStyleLoaded(false);
    mapInstance.setStyle(nextStyle);
  }, [theme, mapStyles, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !viewport) return;
    internalUpdateRef.current = true;
    mapInstance.jumpTo(viewport);
    requestAnimationFrame(() => {
      internalUpdateRef.current = false;
    });
  }, [mapInstance, viewport]);

  const contextValue = useMemo(
    () => ({ map: mapInstance, isLoaded: isLoaded && isStyleLoaded }),
    [mapInstance, isLoaded, isStyleLoaded],
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn("relative h-full w-full", className)}>
        {(!isLoaded || loading) && <DefaultLoader />}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: MapLibreGL.Marker;
  map: MapLibreGL.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context)
    throw new Error("Marker components must be used within MapMarker");
  return context;
}

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  onClick?: (event: MouseEvent) => void;
  onMouseEnter?: (event: MouseEvent) => void;
  onMouseLeave?: (event: MouseEvent) => void;
  onDragStart?: (lngLat: { lng: number; lat: number }) => void;
  onDrag?: (lngLat: { lng: number; lat: number }) => void;
  onDragEnd?: (lngLat: { lng: number; lat: number }) => void;
} & Omit<MarkerOptions, "element">;

function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap();
  const [marker, setMarker] = useState<MapLibreGL.Marker | null>(null);
  const callbacksRef = useRef({
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  });
  callbacksRef.current = {
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  };

  // Created in an effect so server rendering never touches `document`.
  useEffect(() => {
    const element = document.createElement("div");
    const markerInstance = new MapLibreGL.Marker({
      ...markerOptions,
      element,
      draggable,
    }).setLngLat([longitude, latitude]);
    const handleClick = (event: MouseEvent) =>
      callbacksRef.current.onClick?.(event);
    const handleMouseEnter = (event: MouseEvent) =>
      callbacksRef.current.onMouseEnter?.(event);
    const handleMouseLeave = (event: MouseEvent) =>
      callbacksRef.current.onMouseLeave?.(event);
    element.addEventListener("click", handleClick);
    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);
    markerInstance.on("dragstart", () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    markerInstance.on("drag", () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    markerInstance.on("dragend", () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    });
    if (map) markerInstance.addTo(map);
    setMarker(markerInstance);
    return () => {
      element.removeEventListener("click", handleClick);
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      markerInstance.remove();
      setMarker(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    marker?.setLngLat([longitude, latitude]);
  }, [marker, longitude, latitude]);

  useEffect(() => {
    if (marker && marker.isDraggable() !== draggable)
      marker.setDraggable(draggable);
  }, [marker, draggable]);

  if (!marker) return null;
  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

type MarkerContentProps = {
  children?: ReactNode;
  className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();
  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement(),
  );
}

function DefaultMarkerIcon() {
  return (
    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-ink shadow-lg" />
  );
}

type MarkerTooltipProps = {
  children: ReactNode;
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({
  children,
  className,
  ...popupOptions
}: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map) return;
    const el = document.createElement("div");
    const tooltip = new MapLibreGL.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");
    tooltip.setDOMContent(el);
    const handleMouseEnter = () =>
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    const handleMouseLeave = () => tooltip.remove();
    const markerEl = marker.getElement();
    markerEl?.addEventListener("mouseenter", handleMouseEnter);
    markerEl?.addEventListener("mouseleave", handleMouseLeave);
    setContainer(el);
    return () => {
      markerEl?.removeEventListener("mouseenter", handleMouseEnter);
      markerEl?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
      setContainer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, marker]);

  if (!container) return null;
  return createPortal(
    <div
      className={cn(
        "pointer-events-none rounded-md bg-ink px-2 py-1 text-xs text-balance text-canvas shadow-md",
        className,
      )}
    >
      {children}
    </div>,
    container,
  );
}

type MarkerPopupProps = {
  longitude: number;
  latitude: number;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
} & Omit<PopupOptions, "className">;

function MarkerPopup({
  longitude,
  latitude,
  children,
  className,
  onClose,
  ...popupOptions
}: MarkerPopupProps) {
  const { map } = useMap();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const popupRef = useRef<MapLibreGL.Popup | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!map) return;
    const el = document.createElement("div");
    const popup = new MapLibreGL.Popup({
      offset: 16,
      closeButton: true,
      closeOnClick: false,
      ...popupOptions,
    });
    popup.setDOMContent(el);
    popup.setLngLat([longitude, latitude]);
    popup.addTo(map);
    popup.on("close", () => onCloseRef.current?.());
    popupRef.current = popup;
    setContainer(el);
    return () => {
      popup.remove();
      popupRef.current = null;
      setContainer(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  if (!container) return null;
  return createPortal(
    <div className={cn("w-60", className)}>{children}</div>,
    container,
  );
}

type MarkerLabelProps = {
  children: ReactNode;
  className?: string;
  position?: "top" | "bottom";
};

function MarkerLabel({
  children,
  className,
  position = "top",
}: MarkerLabelProps) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };
  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 text-[10px] font-medium whitespace-nowrap text-ink",
        positionClasses[position],
        className,
      )}
    >
      {children}
    </div>
  );
}

export { Map, useMap, MapMarker, MarkerContent, MarkerTooltip, MarkerLabel, MarkerPopup };
