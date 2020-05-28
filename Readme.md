# HexFix

I'm trying to make this module to fix the hex grid snapping in FoundryVTT.

This is hardcoded to work on flat-topped hexes with a grid size of 100.

- when dragging tokens it will snap their center to the grid centers

- when WASDing a token it will move it but not snap it (more precisely - it will undo the snap!)