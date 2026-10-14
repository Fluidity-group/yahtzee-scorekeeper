"""Pi CSI capture bridge. One bounded RGBA frame per line; no game decisions."""
import base64
import json
import sys
import time


def main():
    from picamera2 import Picamera2
    camera = Picamera2()
    # Picamera2 RGB888 arrays have BGR byte order; convert explicitly to RGBA.
    camera.configure(camera.create_video_configuration(main={"size": (960, 540), "format": "RGB888"}, queue=False))
    camera.start()
    try:
        import numpy as np
        sequence = 0
        # Request/response prevents stdout from building a queue of stale frames.
        for request in sys.stdin:
            controls = json.loads(request).get("controls", {})
            allowed = {k: v for k, v in controls.items() if k in ("AfMode", "LensPosition", "AeEnable", "ExposureTime", "AnalogueGain")}
            if allowed:
                camera.set_controls(allowed)
            frame = camera.capture_array("main")
            rgba = np.empty((frame.shape[0], frame.shape[1], 4), dtype=np.uint8)
            rgba[:, :, :3] = frame[:, :, ::-1]
            rgba[:, :, 3] = 255
            sequence += 1
            print(json.dumps({"sequence": sequence, "capturedAt": int(time.time() * 1000), "width": frame.shape[1],
                              "height": frame.shape[0], "pixels": base64.b64encode(rgba.tobytes()).decode("ascii")}), flush=True)
    finally:
        camera.stop()
        camera.close()


if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, BrokenPipeError):
        sys.exit(0)
