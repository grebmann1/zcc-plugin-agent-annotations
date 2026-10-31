# Live verification

1. Build/reload with `zcc plugin dev --once` from this directory.
2. Open a thread and a local HTML page in its browser. Toggle Annotate elements, hover a target and click. Save a comment; confirm numbered pin, count and compact composer badge.
3. Edit the pin and verify only its draft snapshot changes; Remove deletes its badge. Cancel/Escape must not save.
4. Submit/queue and confirm pins clear only on success. Reload thread and inspect the saved snapshot. Navigation resets the overlay.
5. Reload plugin source; confirm the toolbar remounts once and old overlay is inactive. Check plugin logs for errors.

Core support is new; use a built Electron from the associated Zana checkout when the installed release predates the toolbar slot.
