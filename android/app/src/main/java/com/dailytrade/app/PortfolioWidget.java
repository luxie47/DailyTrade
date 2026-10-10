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

public class PortfolioWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
        String equity = prefs.getString("equity", "$—");
        String pnl = prefs.getString("pnl", "+$0.00 all time");
        String count = prefs.getString("count", "0 pos");

        boolean isLoss = pnl != null && pnl.startsWith("-");
        int pnlColor = isLoss ? Color.parseColor("#FF3D71") : Color.parseColor("#00E676");
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
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_portfolio);
            views.setTextViewText(R.id.widget_equity, equity);
            views.setTextViewText(R.id.widget_pnl, pnl);
            views.setTextColor(R.id.widget_pnl, pnlColor);
            views.setInt(R.id.widget_pnl, "setBackgroundResource", bgRes);
            views.setTextViewText(R.id.widget_count, count);
            views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);
            appWidgetManager.updateAppWidget(id, views);
        }
    }

    public static void updateAll(Context context, String equity, String pnl, String count) {
        SharedPreferences prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE);
        prefs.edit()
            .putString("equity", equity)
            .putString("pnl", pnl)
            .putString("count", count)
            .apply();

        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, PortfolioWidget.class));
        if (ids != null && ids.length > 0) {
            new PortfolioWidget().onUpdate(context, mgr, ids);
        }
    }
}
