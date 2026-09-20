import { useState, useCallback, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useNotificationStore } from '@store/notificationStore';
import { useBudgetStore } from '@store/budgetStore';
import {
  scheduleReminderNotification,
  cancelScheduledReminder,
} from '../services/notificationService';
import { toast } from '@store/toastStore';
import type { NotificationSettings, RepeatInterval } from '@store/notificationStore';

export type NotificationTab = 'inbox' | 'reminders';

export interface ReminderFormState {
  title:    string;
  body:     string;
  time:     string;      // "HH:MM" 24h
  repeat:   RepeatInterval;
  weekdays: number[];    // 0=Sun..6=Sat; used when repeat='weekly'
  date:     string;      // "YYYY-MM-DD"; used when repeat='none'
}

export const DEFAULT_REMINDER_FORM: ReminderFormState = {
  title:    '',
  body:     '',
  time:     '09:00',
  repeat:   'daily',
  weekdays: [1, 2, 3, 4, 5], // Mon–Fri
  date:     '',
};

export function useNotificationsScreen() {
  const notifications   = useNotificationStore((s) => s.notifications);
  const reminders       = useNotificationStore((s) => s.reminders);
  const settings        = useNotificationStore((s) => s.settings);
  const hasPermission   = useNotificationStore((s) => s.hasPermission);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const markRead        = useNotificationStore((s) => s.markRead);
  const markAllRead     = useNotificationStore((s) => s.markAllRead);
  const deleteNotif     = useNotificationStore((s) => s.deleteNotification);
  const clearAll        = useNotificationStore((s) => s.clearAll);
  const addReminder     = useNotificationStore((s) => s.addReminder);
  const updateReminder  = useNotificationStore((s) => s.updateReminder);
  const deleteReminder  = useNotificationStore((s) => s.deleteReminder);
  const updateSettings  = useNotificationStore((s) => s.updateSettings);

  const budgets = useBudgetStore((s) => s.budgets);

  const [activeTab,       setActiveTab]       = useState<NotificationTab>('inbox');
  const [addSheetVisible, setAddSheetVisible] = useState(false);

  // Auto-generate budget notifications on mount
  useEffect(() => {
    if (!settings.budgetExceeded && !settings.budgetWarning) return;
    budgets.forEach((budget) => {
      if (budget.limit <= 0) return;
      const pct = budget.spent / budget.limit;
      const key = budget.category;

      if (settings.budgetExceeded && pct >= 1) {
        const exists = notifications.some(
          (n) => n.type === 'budget_exceeded' && n.body.includes(key),
        );
        if (!exists) {
          addNotification({
            type:  'budget_exceeded',
            title: 'Budget Exceeded',
            body:  `Your ${key} budget is over the limit (${budget.spent}/${budget.limit})`,
          });
        }
      } else if (settings.budgetWarning && pct >= 0.8) {
        const exists = notifications.some(
          (n) => n.type === 'budget_warning' && n.body.includes(key),
        );
        if (!exists) {
          addNotification({
            type:  'budget_warning',
            title: 'Budget Warning',
            body:  `You've used ${Math.round(pct * 100)}% of your ${key} budget`,
          });
        }
      }
    });
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const handleMarkRead = useCallback(
    (id: string) => { markRead(id); },
    [markRead],
  );

  const handleDelete = useCallback(
    (id: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      deleteNotif(id);
    },
    [deleteNotif],
  );

  const handleClearAll = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    clearAll();
  }, [clearAll]);

  const handleMarkAllRead = useCallback(() => {
    Haptics.selectionAsync();
    markAllRead();
  }, [markAllRead]);

  const handleToggleSetting = useCallback(
    (key: keyof NotificationSettings) => {
      Haptics.selectionAsync();
      updateSettings({ [key]: !settings[key] });
    },
    [settings, updateSettings],
  );

  const handleAddReminder = useCallback(
    async (form: ReminderFormState) => {
      if (!form.title.trim()) {
        toast.error('Please enter a reminder title');
        return;
      }
      if (form.repeat === 'weekly' && form.weekdays.length === 0) {
        toast.error('Select at least one day');
        return;
      }
      let expoId: string | null = null;
      if (hasPermission && settings.remindersEnabled) {
        expoId = await scheduleReminderNotification(
          form.title.trim(),
          form.body.trim() || 'Time to check your finances!',
          form.time,
          form.repeat,
          form.weekdays,
          form.date || null,
        );
      }
      addReminder({
        title:    form.title.trim(),
        body:     form.body.trim() || 'Time to check your finances!',
        time:     form.time,
        repeat:   form.repeat,
        isActive: true,
        expoId,
        weekdays: form.weekdays,
        date:     form.date || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Reminder added');
      setAddSheetVisible(false);
    },
    [hasPermission, settings.remindersEnabled, addReminder],
  );

  const handleToggleReminder = useCallback(
    async (id: string) => {
      const reminder = reminders.find((r) => r.id === id);
      if (!reminder) return;
      Haptics.selectionAsync();
      if (reminder.isActive) {
        if (reminder.expoId) await cancelScheduledReminder(reminder.expoId);
        updateReminder(id, { isActive: false, expoId: null });
      } else {
        let expoId: string | null = null;
        if (hasPermission && settings.remindersEnabled) {
          expoId = await scheduleReminderNotification(
            reminder.title, reminder.body, reminder.time, reminder.repeat,
            reminder.weekdays ?? [], reminder.date ?? null,
          );
        }
        updateReminder(id, { isActive: true, expoId });
      }
    },
    [reminders, hasPermission, settings.remindersEnabled, updateReminder],
  );

  const handleDeleteReminder = useCallback(
    async (id: string) => {
      const r = reminders.find((x) => x.id === id);
      if (r?.expoId) await cancelScheduledReminder(r.expoId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      deleteReminder(id);
    },
    [reminders, deleteReminder],
  );

  return {
    notifications,
    reminders,
    settings,
    hasPermission,
    unreadCount,
    activeTab,
    setActiveTab,
    addSheetVisible,
    openAddSheet:  () => setAddSheetVisible(true),
    closeAddSheet: () => setAddSheetVisible(false),
    handlers: {
      markRead:        handleMarkRead,
      delete:          handleDelete,
      clearAll:        handleClearAll,
      markAllRead:     handleMarkAllRead,
      toggleSetting:   handleToggleSetting,
      addReminder:     handleAddReminder,
      toggleReminder:  handleToggleReminder,
      deleteReminder:  handleDeleteReminder,
    },
  };
}
