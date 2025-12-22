import { Reminder } from '@/types/reminder';

const STORAGE_KEY = 'reminders';

export const getReminders = (): Reminder[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveReminders = (reminders: Reminder[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
};

export const addReminder = (icerik: string): Reminder => {
  const reminders = getReminders();
  const yeniReminder: Reminder = {
    id: crypto.randomUUID(),
    icerik,
    olusturmaTarihi: new Date().toISOString(),
    tamamlandi: false,
  };
  reminders.unshift(yeniReminder);
  saveReminders(reminders);
  return yeniReminder;
};

export const toggleReminder = (id: string): Reminder[] => {
  const reminders = getReminders();
  const updated = reminders.map((r) =>
    r.id === id ? { ...r, tamamlandi: !r.tamamlandi } : r
  );
  saveReminders(updated);
  return updated;
};

export const deleteReminder = (id: string): Reminder[] => {
  const reminders = getReminders();
  const updated = reminders.filter((r) => r.id !== id);
  saveReminders(updated);
  return updated;
};
