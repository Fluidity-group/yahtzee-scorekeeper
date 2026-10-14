# SW-006 Pixel test installation — 3 October 2026

User authorization: connected Pixel and requested opening the app from an icon for testing. Hardware-validation workflow applied only to installation/launcher readiness, not camera or game acceptance.

Fresh adb inventory identified one authorized Pixel11 Pro XL, Android17/API37. Serial retained only in local tool evidence, not published here. Existing package `com.fluiditygroup.diceclubhouse.dev` was present. Installed the identified standard debug APK with `adb install -r`; success, no app-data clear/uninstall/downgrade. No camera connection or recognition test was executed.

APK: `artifacts/sw006-oct02/android-test-candidate.apk`; SHA256 `cd553368181173557219e2c3c388ffb9a88aa35e8f71b31923e697f5c1bee372`. Prior build/source/automated verification identity: [Android readiness](SW-006-android-test-readiness.md). Application label `Dice Clubhouse Dev`, versionName1.0/versionCode1. Manifest MAIN/LAUNCHER resolves to `.MainActivity`; native launch returned Status:ok, cold launch518ms. This is Android activity launch timing, not camera latency.

Final state: application launched on the Pixel for user testing. Launcher entry is available in the app drawer. User can long-press and drag its icon onto the home screen. Real phone user journeys and C121 specimen/firmware/network/optical/thermal acceptance remain open; follow [arrival test pack](SW-006-android-arrival-test-pack.md). No G3/commercial acceptance inferred.
