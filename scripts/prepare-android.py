from pathlib import Path

manifest = Path("android/app/src/main/AndroidManifest.xml")
source = manifest.read_text(encoding="utf-8")
permissions = """    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
"""
if "android.permission.RECORD_AUDIO" not in source:
    source = source.replace("<application", permissions + "    <application", 1)
manifest.write_text(source, encoding="utf-8")
print("Added Internet, microphone and camera manifest permissions.")
