import { expect, type Page } from '@playwright/test';

// "Today" is pinned so balance math is deterministic. 2026-06-29 is a Monday,
// so one "Zurück" in week view lands on the fully-past week Mon 06-22 … Sun 06-28.
export const FIXED_NOW = new Date('2026-06-29T09:00:00');

export async function open(page: Page) {
  await page.clock.install({ time: FIXED_NOW });
  // No network in tests → app falls back to computed (correct) holidays.
  await page.route('**/date.nager.at/**', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.day-table')).toBeVisible();
  await expect(page.locator('.loading-overlay')).toHaveCount(0);
}

export const goPrev = (page: Page) => page.getByRole('button', { name: 'Zurück' }).click();
export const dayRow = (page: Page, i: number) => page.locator('.day-row:not(.head)').nth(i);
export const tile = (page: Page, label: string) =>
  page.locator('.total', { hasText: label }).locator('.total-value');

export async function fillRange(page: Page, rowIndex: number, von: string, bis: string) {
  const inputs = dayRow(page, rowIndex).locator('.time-block .time-input');
  await inputs.nth(0).fill(von);
  await inputs.nth(1).fill(bis);
}
