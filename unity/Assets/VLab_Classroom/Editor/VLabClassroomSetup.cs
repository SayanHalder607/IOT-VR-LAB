#if UNITY_EDITOR
using System.Collections.Generic;
using UnityEditor;
using UnityEngine;
using UnityEngine.Rendering;

namespace VLab
{
    public static class ClassroomSetup
    {
        const string Folder = "Assets/VLab_Classroom";
        const string ModelPath = Folder + "/VLab_Classroom.obj";
        const string MatFolder = Folder + "/Materials";

        [MenuItem("VLab/Add Classroom To Scene")]
        public static void AddToScene()
        {
            AssetDatabase.ImportAsset(ModelPath, ImportAssetOptions.ForceUpdate);
            GameObject model = AssetDatabase.LoadAssetAtPath<GameObject>(ModelPath);
            if (model == null)
            {
                EditorUtility.DisplayDialog("VLab Classroom", "Could not find " + ModelPath + ". Please re-import the package.", "OK");
                return;
            }

            GameObject root = new GameObject("VLab_Classroom_Root");
            Undo.RegisterCreatedObjectUndo(root, "Add VLab Classroom");

            GameObject room = (GameObject)PrefabUtility.InstantiatePrefab(model);
            room.name = "VLab_Classroom";
            room.transform.SetParent(root.transform, false);

            FixMaterialsForPipeline(room);
            AddColliders(room);
            AddRoomBounds(root.transform);
            AddLights(root.transform);

            Selection.activeGameObject = root;
            if (SceneView.lastActiveSceneView != null)
            {
                SceneView.lastActiveSceneView.FrameSelected();
            }
        }

        [MenuItem("VLab/Add Walking Player (WASD + mouse)")]
        public static void AddPlayer()
        {
            GameObject player = new GameObject("VLab_Player");
            Undo.RegisterCreatedObjectUndo(player, "Add VLab Player");
            player.transform.position = new Vector3(0f, 0f, 9f);
            player.transform.rotation = Quaternion.Euler(0f, 180f, 0f);

            CharacterController cc = player.AddComponent<CharacterController>();
            cc.height = 1.7f;
            cc.radius = 0.3f;
            cc.center = new Vector3(0f, 0.85f, 0f);
            cc.stepOffset = 0.1f;

            GameObject camGo = new GameObject("PlayerCamera");
            camGo.transform.SetParent(player.transform, false);
            camGo.transform.localPosition = new Vector3(0f, 1.6f, 0f);
            camGo.tag = "MainCamera";
            Camera cam = camGo.AddComponent<Camera>();
            camGo.AddComponent<AudioListener>();

            foreach (Camera other in Camera.allCameras)
            {
                if (other != cam)
                {
                    other.gameObject.SetActive(false);
                }
            }

            player.AddComponent<Walker>();
            Selection.activeGameObject = player;
            EditorUtility.DisplayDialog("VLab Classroom", "Walking player added. Press Play, then use W A S D, Shift to run, mouse to look, Esc to free the cursor.", "OK");
        }

        static void AddLights(Transform parent)
        {
            GameObject group = new GameObject("VLab_ZoneLights");
            group.transform.SetParent(parent, false);
            float[] zs = { -7f, -1f, 5f, 11f };
            for (int i = 0; i < zs.Length; i++)
            {
                GameObject lg = new GameObject("ZoneLight_" + (i + 1));
                lg.transform.SetParent(group.transform, false);
                lg.transform.localPosition = new Vector3(0f, 3.2f, zs[i]);
                Light l = lg.AddComponent<Light>();
                l.type = LightType.Point;
                l.range = 22f;
                l.intensity = 1.2f;
                l.color = new Color(1f, 0.95f, 0.86f);
            }
            RenderSettings.ambientMode = AmbientMode.Flat;
            RenderSettings.ambientLight = new Color(0.55f, 0.56f, 0.58f);
        }

        static void AddRoomBounds(Transform parent)
        {
            GameObject b = new GameObject("VLab_RoomBounds");
            b.transform.SetParent(parent, false);
            MakeWall(b.transform, "WallLeft", new Vector3(-13.25f, 1.8f, 1.5f), new Vector3(0.5f, 3.6f, 26f));
            MakeWall(b.transform, "WallRight", new Vector3(13.25f, 1.8f, 1.5f), new Vector3(0.5f, 3.6f, 26f));
            MakeWall(b.transform, "WallFront", new Vector3(0f, 1.8f, -11.25f), new Vector3(27f, 3.6f, 0.5f));
            MakeWall(b.transform, "WallBack", new Vector3(0f, 1.8f, 14.25f), new Vector3(27f, 3.6f, 0.5f));
        }

        static void MakeWall(Transform parent, string name, Vector3 center, Vector3 size)
        {
            GameObject w = new GameObject(name);
            w.transform.SetParent(parent, false);
            w.transform.localPosition = center;
            BoxCollider bc = w.AddComponent<BoxCollider>();
            bc.size = size;
        }

        static void AddColliders(GameObject room)
        {
            foreach (MeshFilter mf in room.GetComponentsInChildren<MeshFilter>())
            {
                if (mf.sharedMesh == null)
                {
                    continue;
                }
                Bounds bd = mf.sharedMesh.bounds;
                Vector3 s = bd.size;
                if (Mathf.Min(s.x, Mathf.Min(s.y, s.z)) < 0.004f)
                {
                    continue; // flat planes (floor, walls, posters) are skipped
                }
                BoxCollider bc = mf.gameObject.AddComponent<BoxCollider>();
                bc.center = bd.center;
                bc.size = s;
            }
        }

        static bool NeedsFix(Material m)
        {
            if (m == null || m.shader == null)
            {
                return true;
            }
            string n = m.shader.name;
            return n == "Standard" || n.StartsWith("Hidden/") || n.StartsWith("Legacy Shaders/");
        }

        static string SafeName(string n)
        {
            foreach (char c in System.IO.Path.GetInvalidFileNameChars())
            {
                n = n.Replace(c, '_');
            }
            return n;
        }

        // In URP or HDRP projects the imported OBJ materials can show as pink; this swaps in the pipeline's Lit shader.
        static void FixMaterialsForPipeline(GameObject room)
        {
            RenderPipelineAsset rp = GraphicsSettings.currentRenderPipeline;
            if (rp == null || rp.defaultMaterial == null)
            {
                return; // Built-in pipeline: nothing to do
            }
            Shader lit = rp.defaultMaterial.shader;
            if (lit == null)
            {
                return;
            }
            if (!AssetDatabase.IsValidFolder(MatFolder))
            {
                AssetDatabase.CreateFolder(Folder, "Materials");
            }

            Dictionary<Material, Material> map = new Dictionary<Material, Material>();
            foreach (Renderer r in room.GetComponentsInChildren<Renderer>())
            {
                Material[] src = r.sharedMaterials;
                Material[] dst = new Material[src.Length];
                for (int i = 0; i < src.Length; i++)
                {
                    Material m = src[i];
                    if (m == null || !NeedsFix(m))
                    {
                        dst[i] = m;
                        continue;
                    }
                    Material n;
                    if (!map.TryGetValue(m, out n))
                    {
                        n = new Material(lit);
                        n.name = m.name;
                        Color c = m.HasProperty("_Color") ? m.GetColor("_Color") : Color.white;
                        Texture t = m.HasProperty("_MainTex") ? m.GetTexture("_MainTex") : null;
                        if (n.HasProperty("_BaseColor")) n.SetColor("_BaseColor", c);
                        if (n.HasProperty("_BaseMap") && t != null) n.SetTexture("_BaseMap", t);
                        if (n.HasProperty("_BaseColorMap") && t != null) n.SetTexture("_BaseColorMap", t);
                        if (n.HasProperty("_Smoothness")) n.SetFloat("_Smoothness", 0.25f);
                        string path = AssetDatabase.GenerateUniqueAssetPath(MatFolder + "/" + SafeName(m.name) + ".mat");
                        AssetDatabase.CreateAsset(n, path);
                        map[m] = n;
                    }
                    dst[i] = n;
                }
                r.sharedMaterials = dst;
            }
            AssetDatabase.SaveAssets();
        }
    }
}
#endif
