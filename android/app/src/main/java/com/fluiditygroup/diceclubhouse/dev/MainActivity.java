package com.fluiditygroup.diceclubhouse.dev;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(C121CameraPlugin.class);
        super.onCreate(savedInstanceState);
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        View content = findViewById(android.R.id.content);
        // Keep the entire WebView inside the system bars, cutout and keyboard.
        // This also protects dialogs and sticky headers, not just the page body.
        ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            int handledTypes = WindowInsetsCompat.Type.systemBars()
                | WindowInsetsCompat.Type.displayCutout() | WindowInsetsCompat.Type.ime();
            Insets safe = insets.getInsets(handledTypes);
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            if ((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
                android.util.Log.d("DiceInsets", "Content padding: " + safe.left + "," + safe.top + "," + safe.right + "," + safe.bottom);
            }
            // Forward zeroed insets so WebView clears any previous CSS safe area
            // after rotation/keyboard changes without adding the padding twice.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(handledTypes, Insets.NONE).build();
        });
        ViewCompat.requestApplyInsets(content);
    }
}

