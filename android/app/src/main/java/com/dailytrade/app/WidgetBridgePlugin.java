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
}
