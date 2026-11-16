Real photos for the Home mood cards come from the server (GET /api/photos), found from each card's words
(see PHOTO_QUERY in client/src/components/home/MoodTiles.jsx).

Want a specific picture instead? Drop your own photo here, one per card (about 1200px wide, JPG):
waterfall.jpg  beach.jpg  cheap.jpg  rain.jpg  top.jpg  adventure.jpg
Your file is tried first; if it is missing, the found photo is used; if that fails too, the card keeps its contour lines.
