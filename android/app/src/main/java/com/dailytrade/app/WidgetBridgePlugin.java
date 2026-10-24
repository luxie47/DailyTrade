package com.dailytrade.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void updateWidget(PluginCall call) {
        String equity = call.getString("equity", "$—");
        String pnl = call.getString("pnl", "");
        String count = call.getString("count", "0 pos");

        String symbol = call.getString("symbol", "BTC");
        String price = call.getString("price", "$—");
        String change = call.getString("change", "+0.0%");

        PortfolioWidget.updateAll(getContext(), equity, pnl, count);
        TickerWidget.updateAll(getContext(), symbol, price, change);

        call.resolve();
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path is required");
            return;
        }

        try {
            java.io.File file;
            if (filePath.startsWith("file://")) {
                file = new java.io.File(new java.net.URI(filePath));
            } else {
                file = new java.io.File(filePath);
            }

            if (!file.exists()) {
                call.reject("APK file does not exist at " + file.getAbsolutePath());
                return;
            }

            android.content.Context context = getContext();
            android.net.Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                context,
                context.getPackageName() + ".fileprovider",
                file
            );

            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
            intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to launch installer: " + e.getMessage(), e);
        }
    }
}
