"use client";

import { useEffect, useRef, useState } from "react";
import { Modal, useModal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, Building2, Plus } from "lucide-react";

declare global {
  interface Window {
    L?: any;
  }
}

export interface Spbu {
  id: string;
  code: string;
  name: string;
  address: string;
  coords: string;
}

export type SpbuInput = Omit<Spbu, "id">;

interface AddSpbuFormProps {
  spbu?: Spbu;
  onSubmit: (spbu: SpbuInput, id?: string) => Promise<void>;
  renderTrigger?: (open: () => void) => React.ReactNode;
}

function AddSpbuForm({ spbu, onSubmit, renderTrigger }: AddSpbuFormProps) {
  const { isOpen, open, close } = useModal();
  const [mapReady, setMapReady] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const reverseGeocodeTimer = useRef<NodeJS.Timeout | null>(null);
  const lastReverseCoords = useRef<string>("");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    address: "",
    coords: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = Boolean(spbu);

  const parseCoords = (coords: string) => {
    const [latStr, lngStr] = coords.split(",").map((item) => item.trim());
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng] as [number, number];
    return null;
  };

  // Leaflet is loaded from CDN to avoid extra dependencies.
  const ensureLeaflet = async () => {
    if (typeof window === "undefined") return null;
    if (window.L) return window.L;

    const leafletCssId = "leaflet-cdn-style";
    if (!document.getElementById(leafletCssId)) {
      const link = document.createElement("link");
      link.id = leafletCssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    await new Promise<void>((resolve, reject) => {
      const existing = document.getElementById("leaflet-cdn-script");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "leaflet-cdn-script";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Leaflet failed to load"));
      document.body.appendChild(script);
    });

    return window.L;
  };

  const initMap = async () => {
    if (mapReady || !isOpen) return;
    const L = await ensureLeaflet();
    if (!L) return;

    const defaultCenter = [-6.2, 106.816666]; // Jakarta
    const parsed = parseCoords(formData.coords);
    const startCoords = parsed || defaultCenter;

    const container = document.getElementById("spbu-map");
    if (!container) return;

    const map = L.map(container, { zoomControl: true, attributionControl: false }).setView(startCoords, parsed ? 14 : 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    const marker = L.marker(startCoords, { draggable: true }).addTo(map);
    mapRef.current = map;
    markerRef.current = marker;

    const updateCoords = (lat: number, lng: number) => {
      const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setFormData((prev) => ({ ...prev, coords: formatted }));
    };

    map.on("click", (e: any) => {
      marker.setLatLng(e.latlng);
      updateCoords(e.latlng.lat, e.latlng.lng);
    });

    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      updateCoords(lat, lng);
    });

    setMapReady(true);
  };

  useEffect(() => {
    if (isOpen) void initMap();
    if (!isOpen && mapReady) {
      mapRef.current?.remove?.();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (spbu) {
      setFormData({
        code: spbu.code,
        name: spbu.name,
        address: spbu.address,
        coords: spbu.coords,
      });
    }
  }, [spbu]);

  const sampleSpbu = [
    { code: "34.13102", name: "Lenteng Agung", address: "Jl. Lenteng Agung Raya No. 25, Jakarta Selatan", coords: "-6.336510, 106.820110" },
    { code: "31.17602", name: "Pondok Gede", address: "Jl. Raya Pondok Gede No. 88, Bekasi", coords: "-6.268540, 106.924110" },
    { code: "34.16906", name: "Kalimalang", address: "Jl. Inspeksi Saluran Kalimalang, Bekasi", coords: "-6.250210, 106.941410" },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (!mapReady || !window.L) return;
    const parsed = parseCoords(formData.coords);
    if (!parsed) return;
    if (markerRef.current) {
      markerRef.current.setLatLng({ lat: parsed[0], lng: parsed[1] });
      mapRef.current?.setView(parsed);
    }
  }, [formData.coords, mapReady]);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=id`,
        { headers: { "User-Agent": "voltex-app" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const label = data.display_name as string | undefined;
      if (label && label !== formData.address) {
        setFormData((prev) => ({ ...prev, address: label }));
      }
    } catch {
      // Silent fail for offline/blocked requests.
    }
  };

  useEffect(() => {
    if (!mapReady) return;
    const parsed = parseCoords(formData.coords);
    const coordsKey = parsed ? `${parsed[0].toFixed(5)},${parsed[1].toFixed(5)}` : "";
    if (!parsed || coordsKey === lastReverseCoords.current) return;

    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    reverseGeocodeTimer.current = setTimeout(() => {
      lastReverseCoords.current = coordsKey;
      reverseGeocode(parsed[0], parsed[1]);
    }, 500);

    return () => {
      if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    };
  }, [formData.coords, mapReady]);

  const geocodeAddress = async () => {
    if (!formData.address.trim()) return;
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          formData.address
        )}&limit=1&accept-language=id`,
        { headers: { "User-Agent": "voltex-app" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      const first = data?.[0];
      if (first?.lat && first?.lon) {
        const lat = Number(first.lat);
        const lng = Number(first.lon);
        const formatted = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        setFormData((prev) => ({ ...prev, coords: formatted }));
        if (markerRef.current) {
          markerRef.current.setLatLng({ lat, lng });
          mapRef.current?.setView([lat, lng], 16);
        }
      }
    } catch {
      // no-op
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleGenerate = () => {
    const pick = sampleSpbu[Math.floor(Math.random() * sampleSpbu.length)];
    setFormData({
      code: pick.code,
      name: pick.name,
      address: pick.address,
      coords: pick.coords,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload: SpbuInput = {
      code: formData.code,
      name: formData.name,
      address: formData.address,
      coords: formData.coords,
    };

    try {
      await onSubmit(payload, spbu?.id);
      setFormData({ code: "", name: "", address: "", coords: "" });
      close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(open)
      ) : (
        <button
          onClick={open}
          className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20"
        >
          <Plus className="h-4 w-4" /> New SPBU
        </button>
      )}

      <Modal isOpen={isOpen} onClose={close} title={isEdit ? "Ubah SPBU" : "Tambah SPBU"} size="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="code" className="text-sm font-medium text-foreground">
                Kode SPBU
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="34.17107"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nama SPBU
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                  placeholder="SPBU Cipayung"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="address" className="text-sm font-medium text-foreground">
              Alamat Lengkap
            </label>
            <div className="space-y-2">
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                rows={3}
                placeholder="Jl. Raya ..."
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={geocodeAddress}
                  disabled={isGeocoding}
                  className="rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeocoding ? "Mencari..." : "Pin dari alamat"}
                </button>
                <p className="text-xs text-muted-foreground self-center">Masukkan alamat lalu klik untuk memusatkan peta.</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="coords" className="text-sm font-medium text-foreground">
              Koordinat (Lat, Long)
            </label>
            <div className="relative">
              <Navigation className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="coords"
                name="coords"
                value={formData.coords}
                onChange={handleChange}
                className="w-full rounded-2xl border border-border/70 bg-background/60 pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                placeholder="-6.317210, 106.903220"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Klik pada peta atau drag marker untuk mengisi koordinat.</p>
            <div
              id="spbu-map"
              className="h-64 w-full overflow-hidden rounded-2xl border border-border/70"
              role="presentation"
            />
          </div>

          <Card variant="status" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Quick Fill</p>
                <p className="text-xs text-muted-foreground">Generate sample SPBU data</p>
              </div>
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition"
              >
                Generate
              </button>
            </div>
          </Card>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-2xl border border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isEdit ? "Update SPBU" : "Simpan SPBU"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddSpbuForm;
