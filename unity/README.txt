VLab Classroom for Unity
========================
A 26 x 25 m classroom with 14 experiment tables, a teacher desk, 6 air conditioners,
12 ceiling lights, 6 bookshelves, a whiteboard and 8 IoT posters. Units are metres.

QUICK START
1. Import:  Assets > Import Package > Custom Package... > VLab_Classroom.unitypackage > Import.
2. Menu  VLab > Add Classroom To Scene      (adds the room, colliders and lights)
3. Menu  VLab > Add Walking Player (WASD + mouse)   then press Play.
   W A S D = walk, Shift = run, mouse = look, Esc = free the cursor.

NOTES
- Works with the Built-in, URP and HDRP pipelines. In URP/HDRP the menu swaps the imported
  materials to the pipeline's Lit shader (new materials are saved in Assets/VLab_Classroom/Materials).
  If anything is pink, run "Add Classroom To Scene" again on a fresh instance.
- If textures look missing right after import, right-click VLab_Classroom.obj > Reimport.
- The point lights use Built-in/URP intensity. In HDRP raise their Intensity (try 3000 lumens).
- The model is geometry, materials and textures only. The experiments and their code run in the
  web version, not inside Unity.
- Object names show where things are, e.g. Table_03_Traffic_Light_Simulator, AirCon_1, SwitchBoard.
