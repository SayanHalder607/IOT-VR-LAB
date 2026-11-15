using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace VLab
{
    // First-person walking: WASD to move, Shift to run, mouse to look, Esc to free the cursor.
    [RequireComponent(typeof(CharacterController))]
    public class Walker : MonoBehaviour
    {
        public float walkSpeed = 1.8f;
        public float runSpeed = 3.4f;
        public float lookSensitivity = 0.12f;

        CharacterController controller;
        Transform head;
        float pitch;

        void Start()
        {
            controller = GetComponent<CharacterController>();
            Camera cam = GetComponentInChildren<Camera>();
            head = cam != null ? cam.transform : transform;
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
        }

        void Update()
        {
            Vector2 look = Vector2.zero;
            Vector2 move = Vector2.zero;
            bool run = false;
            bool unlock = false;

#if ENABLE_INPUT_SYSTEM
            Keyboard kb = Keyboard.current;
            Mouse mouse = Mouse.current;
            if (mouse != null)
            {
                look = mouse.delta.ReadValue() * lookSensitivity;
            }
            if (kb != null)
            {
                move.x = (kb.dKey.isPressed ? 1f : 0f) - (kb.aKey.isPressed ? 1f : 0f);
                move.y = (kb.wKey.isPressed ? 1f : 0f) - (kb.sKey.isPressed ? 1f : 0f);
                run = kb.leftShiftKey.isPressed;
                unlock = kb.escapeKey.wasPressedThisFrame;
            }
#else
            look = new Vector2(Input.GetAxis("Mouse X"), Input.GetAxis("Mouse Y")) * 2f;
            move = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            run = Input.GetKey(KeyCode.LeftShift);
            unlock = Input.GetKeyDown(KeyCode.Escape);
#endif

            if (unlock)
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
            }

            transform.Rotate(0f, look.x, 0f);
            pitch = Mathf.Clamp(pitch - look.y, -80f, 80f);
            head.localEulerAngles = new Vector3(pitch, 0f, 0f);

            Vector3 dir = transform.right * move.x + transform.forward * move.y;
            if (dir.sqrMagnitude > 1f)
            {
                dir.Normalize();
            }
            controller.Move(dir * (run ? runSpeed : walkSpeed) * Time.deltaTime);
        }
    }
}
