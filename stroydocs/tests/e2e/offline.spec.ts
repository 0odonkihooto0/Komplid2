import { test, expect } from '@playwright/test';

test.describe('Offline mode', () => {
  test('should save journal entry offline and sync on reconnect', async ({ page, context }) => {
    await page.goto('/mobile/journal');
    await page.waitForLoadState('networkidle');

    // Переключаем в offline
    await context.setOffline(true);

    await page.getByText('Новая запись').first().click();
    await page.getByPlaceholder('Что сделали сегодня?').fill('Залили фундамент 50 м3');
    await page.getByText('Сохранить запись').click();

    // Баннер офлайн должен быть виден
    await expect(page.getByText('Нет подключения')).toBeVisible();

    // Запись должна отображаться в списке даже офлайн
    await expect(page.getByText('Залили фундамент 50 м3')).toBeVisible();

    // Возвращаем online
    await context.setOffline(false);

    // Ожидаем автоматическую синхронизацию (максимум 10 сек)
    await expect(page.getByText('Ожидают синхронизации')).toBeHidden({ timeout: 10000 });
  });

  test('should cache main pages for offline browsing', async ({ page, context }) => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');

    // Ждём активации service worker и прогрева кэша
    await page.waitForTimeout(2000);

    await context.setOffline(true);
    await page.reload();

    // Страница должна открыться из кэша
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
  });

  test('should show offline fallback for uncached routes', async ({ page, context }) => {
    await page.goto('/mobile');
    await page.waitForLoadState('networkidle');

    await context.setOffline(true);

    // Некэшированный маршрут должен показать заглушку
    await page.goto('/some/uncached/route');
    await expect(page.getByText(/нет подключения|offline/i)).toBeVisible({ timeout: 5000 });
  });
});
