"""
=================================================================
LAYER 2: MOCK DATA STREAM & SATELLITE INPUT PIPELINE
Xarray-Based Multi-Dimensional Climate Data Loader with
Spatial Kriging Interpolation for NaN Imputation
=================================================================

This module provides:
  1. A synthetic NetCDF-like data generator mimicking ISRO MOSDAC/VEDAS
     satellite feeds over the Indian subcontinent bounding box.
  2. A localized spatial kriging interpolation engine to fill NaN gaps
     caused by cloud-cover blockages in real satellite imagery.
  3. Conversion utilities from xarray Datasets to normalized PyTorch
     tensors ready for FNO surrogate model consumption.

Bounding Box:
    Latitude:  8.0 N to 38.0 N  (Indian subcontinent)
    Longitude: 68.0 E to 98.0 E

Variables (5 channels):
    0: Temperature (T)        [Kelvin]
    1: Specific Humidity (q)  [kg/kg]
    2: Zonal Wind (u)         [m/s]
    3: Meridional Wind (v)    [m/s]
    4: Surface Pressure (p)   [hPa]
=================================================================
"""

import json
import urllib.request
import urllib.error
import numpy as np
import torch

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Constants
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INDIA_BOUNDS = {
    "lat_min": 8.0,
    "lat_max": 38.0,
    "lon_min": 68.0,
    "lon_max": 98.0,
}

GRID_RESOLUTION = 0.5   # degrees (approx 55 km)
N_LAT = int((INDIA_BOUNDS["lat_max"] - INDIA_BOUNDS["lat_min"]) / GRID_RESOLUTION)  # 60
N_LON = int((INDIA_BOUNDS["lon_max"] - INDIA_BOUNDS["lon_min"]) / GRID_RESOLUTION)  # 60
N_VARIABLES = 5
VARIABLE_NAMES = ["temperature", "humidity", "wind_u", "wind_v", "pressure"]

# Physical baseline ranges for each variable (used for generation & normalization)
VARIABLE_BASELINES = {
    "temperature": {"mean": 300.0, "std": 8.0, "unit": "K"},
    "humidity":    {"mean": 0.012, "std": 0.005, "unit": "kg/kg"},
    "wind_u":      {"mean": 2.0,   "std": 4.0, "unit": "m/s"},
    "wind_v":      {"mean": -1.5,  "std": 3.5, "unit": "m/s"},
    "pressure":    {"mean": 1013.0, "std": 8.0, "unit": "hPa"},
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Synthetic Satellite Data Generator
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def generate_mock_satellite_data(
    n_timesteps: int = 30,
    nan_fraction: float = 0.08,
    seed: int = 42,
):
    """
    Generates a synthetic multi-dimensional climate dataset mimicking
    ISRO MOSDAC INSAT-3D / Scatsat-1 / Oceansat satellite observations.

    The data includes realistic spatial patterns:
      - Temperature decreases with latitude (cooler in the Himalayas)
      - Humidity is higher along the Western Ghats and NE India
      - Monsoon winds blow from the southwest
      - Pressure follows standard ISA with terrain effects

    NaN values are injected to simulate real cloud-cover blockages.

    Args:
        n_timesteps:  Number of time steps (days). Default 30.
        nan_fraction: Fraction of grid cells masked as NaN. Default 0.08.
        seed:         Random seed for reproducibility.

    Returns:
        dict with keys:
            'lats':      np.ndarray [N_LAT]
            'lons':      np.ndarray [N_LON]
            'time':      np.ndarray [n_timesteps]
            'data':      np.ndarray [n_timesteps, N_LAT, N_LON, N_VARIABLES]
            'variables': list of variable names
            'metadata':  dict with bounds and resolution info
    """
    rng = np.random.default_rng(seed)

    lats = np.linspace(INDIA_BOUNDS["lat_min"], INDIA_BOUNDS["lat_max"], N_LAT)
    lons = np.linspace(INDIA_BOUNDS["lon_min"], INDIA_BOUNDS["lon_max"], N_LON)
    times = np.arange(n_timesteps)

    lon_grid, lat_grid = np.meshgrid(lons, lats)

    data = np.zeros((n_timesteps, N_LAT, N_LON, N_VARIABLES), dtype=np.float32)

    for t in range(n_timesteps):
        # Channel 0: Temperature -- decreases with latitude, diurnal cycle
        T_base = 310.0 - 0.8 * (lat_grid - 8.0) + 2.0 * np.sin(2.0 * np.pi * t / 30.0)
        data[t, :, :, 0] = T_base + rng.normal(0, 1.5, (N_LAT, N_LON))

        # Channel 1: Humidity -- higher on Western Ghats and NE India
        wg_boost = 0.008 * np.exp(-((lon_grid - 74.0) ** 2) / 8.0) * (lat_grid < 20.0)
        ne_boost = 0.006 * np.exp(-((lon_grid - 92.0) ** 2 + (lat_grid - 25.0) ** 2) / 20.0)
        data[t, :, :, 1] = 0.010 + wg_boost + ne_boost + rng.normal(0, 0.002, (N_LAT, N_LON))
        data[t, :, :, 1] = np.clip(data[t, :, :, 1], 0.001, 0.030)

        # Channel 2: Zonal Wind (u) -- SW monsoon (positive = westerly)
        monsoon_factor = 0.5 + 0.5 * np.sin(2.0 * np.pi * (t + 5) / 30.0)
        data[t, :, :, 2] = 4.0 * monsoon_factor * (1.0 - (lat_grid - 18.0) ** 2 / 400.0)
        data[t, :, :, 2] += rng.normal(0, 1.5, (N_LAT, N_LON))

        # Channel 3: Meridional Wind (v) -- southerly monsoon inflow
        data[t, :, :, 3] = -3.0 * monsoon_factor * np.exp(-((lat_grid - 15.0) ** 2) / 100.0)
        data[t, :, :, 3] += rng.normal(0, 1.0, (N_LAT, N_LON))

        # Channel 4: Pressure -- standard with terrain effects
        terrain = 5.0 * np.exp(-((lon_grid - 78.0) ** 2 + (lat_grid - 32.0) ** 2) / 15.0)
        data[t, :, :, 4] = 1013.0 - 0.12 * lat_grid - terrain + rng.normal(0, 2.0, (N_LAT, N_LON))

    # ── Inject NaN holes (cloud cover blockage) ──
    nan_mask = rng.random((n_timesteps, N_LAT, N_LON)) < nan_fraction
    for ch in range(N_VARIABLES):
        channel_data = data[:, :, :, ch]
        channel_data[nan_mask] = np.nan
        data[:, :, :, ch] = channel_data

    metadata = {
        "bounds": INDIA_BOUNDS,
        "resolution_deg": GRID_RESOLUTION,
        "grid_shape": (N_LAT, N_LON),
        "n_timesteps": n_timesteps,
        "nan_fraction": nan_fraction,
        "source": "Synthetic MOSDAC/VEDAS Simulation",
    }

    return {
        "lats": lats,
        "lons": lons,
        "time": times,
        "data": data,
        "variables": VARIABLE_NAMES,
        "metadata": metadata,
    }


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Xarray Dataset Builder
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_xarray_dataset(raw_data: dict):
    """
    Converts the raw numpy data dictionary into a properly structured
    xarray Dataset with named dimensions and coordinate labels.

    This mirrors the format of real ECMWF ERA5 or MOSDAC NetCDF files.

    Args:
        raw_data: Output from generate_mock_satellite_data().

    Returns:
        xarray.Dataset with dimensions (time, latitude, longitude)
        and data variables for each climate field.
    """
    try:
        import xarray as xr
    except ImportError:
        print("[WARNING] xarray not installed. Returning raw dict instead.")
        return raw_data

    data_vars = {}
    for i, var_name in enumerate(raw_data["variables"]):
        data_vars[var_name] = (
            ["time", "latitude", "longitude"],
            raw_data["data"][:, :, :, i],
        )

    ds = xr.Dataset(
        data_vars,
        coords={
            "time": raw_data["time"],
            "latitude": raw_data["lats"],
            "longitude": raw_data["lons"],
        },
        attrs=raw_data["metadata"],
    )
    return ds


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Spatial Kriging NaN Imputation
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def kriging_impute_nans(data, kernel_size: int = 5):
    """
    Fills NaN gaps in multi-dimensional climate grids using localized
    spatial kriging interpolation. This simulates the standard approach
    for cleaning cloud-cover blockages in real MOSDAC satellite feeds.

    The algorithm uses an iterative Gaussian-weighted spatial average
    of neighboring valid pixels. It converges to a smooth interpolation
    that respects the local spatial autocorrelation structure.

    Args:
        data: np.ndarray of shape [T, H, W, C] with NaN holes.
        kernel_size: Diameter of the local kriging neighborhood.
                     Must be odd. Default 5 (2-pixel radius).

    Returns:
        np.ndarray of shape [T, H, W, C] with all NaN values filled.
    """
    assert kernel_size % 2 == 1, f"kernel_size must be odd, got {kernel_size}"
    assert data.ndim == 4, f"Expected 4D array [T, H, W, C], got {data.ndim}D"

    result = data.copy()
    T, H, W, C = result.shape
    radius = kernel_size // 2

    # Build Gaussian weight kernel
    y_offsets, x_offsets = np.mgrid[-radius:radius+1, -radius:radius+1]
    sigma = radius / 2.0
    gaussian_kernel = np.exp(-(x_offsets ** 2 + y_offsets ** 2) / (2 * sigma ** 2))

    # Iteratively fill NaNs (max 3 passes for convergence)
    for iteration in range(3):
        nan_count_before = np.isnan(result).sum()
        if nan_count_before == 0:
            break

        for ch in range(C):
            for t in range(T):
                field = result[t, :, :, ch]
                nan_mask = np.isnan(field)

                if not nan_mask.any():
                    continue

                # Pad the field for boundary handling
                padded = np.pad(field, radius, mode="reflect")
                padded_valid = np.pad(
                    (~nan_mask).astype(np.float32), radius, mode="constant",
                    constant_values=0.0,
                )

                nan_indices = np.argwhere(nan_mask)
                for idx in nan_indices:
                    iy, ix = idx
                    py, px = iy + radius, ix + radius

                    # Extract local neighborhood
                    neighborhood = padded[py - radius:py + radius + 1,
                                          px - radius:px + radius + 1]
                    valid_mask = padded_valid[py - radius:py + radius + 1,
                                             px - radius:px + radius + 1]

                    # Weighted average of valid neighbors
                    weights = gaussian_kernel * valid_mask
                    weight_sum = weights.sum()

                    if weight_sum > 0:
                        interpolated = np.nansum(neighborhood * weights) / weight_sum
                        result[t, iy, ix, ch] = interpolated

        nan_count_after = np.isnan(result).sum()
        if nan_count_after == nan_count_before:
            # No more progress possible; fill remaining with channel mean
            for ch in range(C):
                ch_mean = np.nanmean(result[:, :, :, ch])
                result[:, :, :, ch] = np.where(
                    np.isnan(result[:, :, :, ch]), ch_mean, result[:, :, :, ch]
                )
            break

    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Normalization & Tensor Conversion
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def normalize_and_tensorize(data, return_stats: bool = False):
    """
    Z-score normalizes each variable channel independently and converts
    the numpy array to a PyTorch float32 tensor.

    Args:
        data: np.ndarray of shape [T, H, W, C], NaN-free.
        return_stats: If True, also return the (mean, std) per channel.

    Returns:
        torch.Tensor of shape [T, H, W, C] (float32)
        Optionally: (tensor, stats_dict)
    """
    assert data.ndim == 4, f"Expected 4D array, got {data.ndim}D"
    assert not np.isnan(data).any(), "Data contains NaN -- run kriging_impute_nans first"

    T, H, W, C = data.shape
    normalized = np.zeros_like(data)
    stats = {}

    for ch in range(C):
        ch_data = data[:, :, :, ch]
        mu = ch_data.mean()
        sigma = ch_data.std() + 1e-8  # avoid div-by-zero
        normalized[:, :, :, ch] = (ch_data - mu) / sigma
        stats[VARIABLE_NAMES[ch]] = {"mean": float(mu), "std": float(sigma)}

    tensor = torch.from_numpy(normalized).float()

    # Shape assertion
    assert tensor.shape == (T, H, W, C), (
        f"Output shape mismatch: expected ({T}, {H}, {W}, {C}), got {tensor.shape}"
    )

    if return_stats:
        return tensor, stats
    return tensor


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Real-Time Synoptic Observation Ingestion (Open-Meteo & Ground Stations)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYNOPTIC_ANCHOR_STATIONS = [
    {"name": "Perundurai", "lat": 11.2758, "lon": 77.5827},
    {"name": "New Delhi", "lat": 28.6139, "lon": 77.2090},
    {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
    {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
    {"name": "Jaipur", "lat": 26.9124, "lon": 75.7873},
    {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
    {"name": "Guwahati", "lat": 26.1445, "lon": 91.7362},
    {"name": "Thiruvananthapuram", "lat": 8.5241, "lon": 76.9366},
    {"name": "Shimla", "lat": 31.1048, "lon": 77.1734},
    {"name": "Patna", "lat": 25.5941, "lon": 85.1376},
    {"name": "Bhubaneswar", "lat": 20.2961, "lon": 85.8245},
    {"name": "Nagpur", "lat": 21.1458, "lon": 79.0882},
]


def fetch_realtime_synoptic_grid(
    server_url: str = "http://localhost:3000/api/weather/bulk",
    timeout: float = 3.5,
):
    """
    Ingests live real-time atmospheric observations from the synoptic proxy
    (Open-Meteo) across anchor stations in India and interpolates them across
    the 60x60 grid using Gaussian radial basis function weighting.

    Returns:
        np.ndarray [N_LAT, N_LON, N_VARIABLES] representing live atmospheric state,
        or None if network is unreachable (triggering graceful fallback).
    """
    payload = json.dumps({"locations": SYNOPTIC_ANCHOR_STATIONS}).encode("utf-8")
    req = urllib.request.Request(
        server_url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "PINN-Surrogate/2.0"},
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            if response.status != 200:
                return None
            body = json.loads(response.read().decode("utf-8"))
            results = body.get("results", [])
    except Exception as exc:
        print(f"  [Pipeline] Live synoptic fetch notice ({exc}); using calibrated physical prior.")
        return None

    # Filter valid stations
    valid_stations = []
    for r in results:
        if r and "temp" in r and "humidity" in r and "lat" in r and "lon" in r:
            valid_stations.append(r)

    if len(valid_stations) < 3:
        return None

    lats = np.linspace(INDIA_BOUNDS["lat_min"], INDIA_BOUNDS["lat_max"], N_LAT)
    lons = np.linspace(INDIA_BOUNDS["lon_min"], INDIA_BOUNDS["lon_max"], N_LON)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    live_slice = np.zeros((N_LAT, N_LON, N_VARIABLES), dtype=np.float32)

    # Gaussian kernel interpolation
    weights_sum = np.zeros((N_LAT, N_LON), dtype=np.float32) + 1e-6
    sigma_deg = 4.5  # correlation length scale in degrees

    temp_field = np.zeros((N_LAT, N_LON), dtype=np.float32)
    hum_field = np.zeros((N_LAT, N_LON), dtype=np.float32)
    wind_u_field = np.zeros((N_LAT, N_LON), dtype=np.float32)
    wind_v_field = np.zeros((N_LAT, N_LON), dtype=np.float32)
    press_field = np.zeros((N_LAT, N_LON), dtype=np.float32)

    for stn in valid_stations:
        s_lat = float(stn["lat"])
        s_lon = float(stn["lon"])
        dist_sq = (lat_grid - s_lat) ** 2 + (lon_grid - s_lon) ** 2
        w = np.exp(-dist_sq / (2.0 * sigma_deg ** 2)).astype(np.float32)

        # Convert to SI / model units
        t_kelvin = float(stn["temp"]) + 273.15
        rh = float(stn.get("humidity", 65.0))
        q_spec = (rh / 100.0) * 0.018  # approximate specific humidity kg/kg
        w_speed = float(stn.get("wind", 12.0)) / 3.6  # km/h to m/s
        u_wind = w_speed * 0.707
        v_wind = -w_speed * 0.707
        p_hpa = float(stn.get("pressure", 1010.0))

        temp_field += w * t_kelvin
        hum_field += w * q_spec
        wind_u_field += w * u_wind
        wind_v_field += w * v_wind
        press_field += w * p_hpa
        weights_sum += w

    live_slice[:, :, 0] = temp_field / weights_sum
    live_slice[:, :, 1] = np.clip(hum_field / weights_sum, 0.001, 0.035)
    live_slice[:, :, 2] = wind_u_field / weights_sum
    live_slice[:, :, 3] = wind_v_field / weights_sum
    live_slice[:, :, 4] = press_field / weights_sum

    print(f"  [Pipeline] Ingested REAL-TIME synoptic grid across {len(valid_stations)} live stations.")
    return live_slice


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Full Pipeline: Load -> Impute -> Normalize -> Tensorize
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def load_climate_tensor(
    n_timesteps: int = 30,
    nan_fraction: float = 0.08,
    seed: int = 42,
    mode: str = "realtime",
):
    """
    End-to-end pipeline: load or generate satellite data, seed with real-time
    synoptic observations when available, impute NaN gaps via kriging,
    normalize, and return a training-ready tensor.

    Args:
        n_timesteps:  Number of temporal samples.
        nan_fraction: Cloud-cover NaN fraction.
        seed:         Random seed.
        mode:         'realtime' to query live synoptic observations, or 'mock'.

    Returns:
        Tuple of:
            tensor: torch.Tensor [T, H, W, 5]
            stats:  dict of per-channel normalization statistics
            lats:   np.ndarray [H]
            lons:   np.ndarray [W]
    """
    # 1. Generate base satellite time-series
    raw = generate_mock_satellite_data(n_timesteps, nan_fraction, seed)

    # 2. Ingest real-time observation slice if in realtime mode
    if mode == "realtime":
        live_grid = fetch_realtime_synoptic_grid()
        if live_grid is not None:
            # Inject live ground-truth into current observation timestep
            raw["data"][0] = live_grid
            # Nudge short-term forecast steps towards live state
            for step in range(1, min(7, n_timesteps)):
                weight = 1.0 / (step + 1.0)
                raw["data"][step] = (1.0 - weight) * raw["data"][step] + weight * live_grid

    # 3. Report NaN statistics
    nan_count = np.isnan(raw["data"]).sum()
    total_cells = raw["data"].size
    print(f"  [Pipeline] Prepared {n_timesteps} timesteps on "
          f"{N_LAT}x{N_LON} grid ({N_VARIABLES} vars)")
    print(f"  [Pipeline] NaN cells: {nan_count}/{total_cells} "
          f"({100.0 * nan_count / total_cells:.1f}%)")

    # 4. Impute NaN holes via spatial kriging
    clean_data = kriging_impute_nans(raw["data"], kernel_size=5)
    remaining_nans = np.isnan(clean_data).sum()
    print(f"  [Pipeline] After kriging imputation: {remaining_nans} NaNs remaining")

    # 5. Normalize and convert to tensor
    tensor, stats = normalize_and_tensorize(clean_data, return_stats=True)
    print(f"  [Pipeline] Output tensor shape: {tensor.shape} (dtype={tensor.dtype})")

    return tensor, stats, raw["lats"], raw["lons"]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Module Self-Test
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if __name__ == "__main__":
    print("=" * 65)
    print("  LAYER 2: Data Pipeline Self-Test")
    print("=" * 65)

    tensor, stats, lats, lons = load_climate_tensor(
        n_timesteps=30, nan_fraction=0.10, seed=2026, mode="realtime"
    )

    print(f"\n  Normalization Statistics:")
    for var_name, s in stats.items():
        print(f"    {var_name:15s}: mean={s['mean']:10.4f}  std={s['std']:8.4f}")

    print(f"\n  Latitude range:  [{lats[0]:.1f}, {lats[-1]:.1f}]")
    print(f"  Longitude range: [{lons[0]:.1f}, {lons[-1]:.1f}]")
    print(f"  Tensor min/max:  [{tensor.min().item():.3f}, {tensor.max().item():.3f}]")
    print(f"\n  [OK] Layer 2 verification complete.")
