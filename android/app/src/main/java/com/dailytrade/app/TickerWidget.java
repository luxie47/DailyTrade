package com.dailytrade.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

public class TickerWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
        String symbol = prefs.getString("symbol", "BTC");
        String price = prefs.getString("price", "$—");
        String change = prefs.getString("change", "+0.0%");

        boolean isLoss = change != null && change.startsWith("-");
        int changeColor = isLoss ? Color.parseColor("#FF3D71") : Color.parseColor("#00E676");
        int bgRes = isLoss ? R.drawable.widget_pill_bear : R.drawable.widget_pill_bull;

        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        for (int id : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ticker);
            views.setTextViewText(R.id.widget_ticker_symbol, symbol);
            views.setTextViewText(R.id.widget_ticker_price, price);
            views.setTextViewText(R.id.widget_ticker_change, change);
            views.setTextColor(R.id.widget_ticker_change, changeColor);
            views.setInt(R.id.widget_ticker_change, "setBackgroundResource", bgRes);
            views.setOnClickPendingIntent(R.id.widget_ticker_root, pendingIntent);
            appWidgetManager.updateAppWidget(id, views);
        }
    }

    public static void updateAll(Context context, String symbol, String price, String change) {
        SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("symbol", symbol)
            .putString("price", price)
            .putString("change", change)
            .apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, TickerWidget.class));
        if (ids != null && ids.length > 0) {
            new TickerWidget().onUpdate(context, mgr, ids);
        }
    }
}
