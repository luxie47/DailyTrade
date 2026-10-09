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
        PortfolioWidget.updateAll(getContext(), equity, pnl);
        call.resolve();
    }
}
