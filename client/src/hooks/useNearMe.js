import { useCallback, useState } from 'react';

// Browser location on demand. origin is [lat, lng] once the visitor allows it.
// status: 'idle' | 'locating' | 'on' | 'denied' | 'unsupported' | 'error'
export function useNearMe() {
  const [state, setState] = useState({ status: 'idle', origin: null });

  const enable = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ status: 'unsupported', origin: null });
      return;
    }
    setState((s) => ({ ...s, status: 'locating' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ status: 'on', origin: [pos.coords.latitude, pos.coords.longitude] }),
      (err) => setState({ status: err?.code === 1 ? 'denied' : 'error', origin: null }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const disable = useCallback(() => setState({ status: 'idle', origin: null }), []);

  return { ...state, active: state.status === 'on', enable, disable };
}

export default useNearMe;
