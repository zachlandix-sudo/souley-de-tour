// The markup of the map pins, as plain strings (no Leaflet), so the pin and its opening drop can be previewed alone.
export const pinSvg = '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 25 15 41 15 41s14-16 14-26.2C29 7.2 22.7 1 15 1z" fill="#FF6A13" stroke="#000" stroke-width="1.5"/><circle cx="15" cy="15" r="5" fill="#000"/></svg>';
// Food places: black pin with an orange centre, so they read apart from orange spot pins.
export const foodPinSvg = pinSvg.replace('fill="#FF6A13" stroke="#000"', 'fill="#111" stroke="#FF6A13"').replace('<circle cx="15" cy="15" r="5" fill="#000"/>', '<circle cx="15" cy="15" r="5" fill="#FF6A13"/>');

// The pin wrapped for the opening sequence: it drops into place after its delay (no beams or glow, those made the map lag).
export const beaconHtml = (kind, delay) => `<div class="pin-beacon" style="--d:${Number(delay).toFixed(2)}s"><div class="pin-rise">${kind === 'food' ? foodPinSvg : pinSvg}</div></div>`;

// The pin of the spotlight (row or pin hovered on the Spots map): it lifts with a small spring and a slow dashed orbit turns around it.
export const livePinHtml = `<div class="pin-live">${pinSvg}</div>`;
