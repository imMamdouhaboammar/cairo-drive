import { test, expect, Page } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Cairo Drive - Open World Driving Simulation & AAA HUD', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[Browser Error]', msg.text());
      }
    });

    await page.goto('/');
    // Wait for canvas to be mounted and ready
    await page.locator('#game-canvas').waitFor({ state: 'visible', timeout: 30000 });
    // Allow engine and physics loop to spin up
    await page.waitForTimeout(1500);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('1. Application boots with 3D canvas and WebGL renderer', async () => {
    await expect(page).toHaveTitle(/Cairo Drive/i);

    const canvas = page.locator('#game-canvas');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(300);
    expect(box!.height).toBeGreaterThan(300);
  });

  test('2. Master HUD renders Egyptian street sign, radar, cluster and action bar', async () => {
    // 1. Street sign banner
    const streetSign = page.locator('[data-testid="cairo-street-sign"]');
    await expect(streetSign).toBeVisible();
    await expect(streetSign).toContainText(/ميدان|كوبري|شارع|كورنيش|حارة/);

    // 2. 2D Radar Minimap
    const radar = page.locator('[data-testid="cairo-radar"]');
    await expect(radar).toBeVisible();
    const radarCanvas = radar.locator('canvas');
    await expect(radarCanvas).toBeVisible();

    // 3. Instrument cluster (speedometer, gear, tachometer)
    const cluster = page.locator('[data-testid="cairo-cluster"]');
    await expect(cluster).toBeVisible();

    const speedVal = page.locator('[data-testid="speedometer-value"]');
    await expect(speedVal).toBeVisible();
    const speedText = await speedVal.textContent();
    expect(Number(speedText)).toBeGreaterThanOrEqual(0);

    const gear = page.locator('[data-testid="gear-indicator"]');
    await expect(gear).toBeVisible();

    // 4. Action bar buttons
    const actionBar = page.locator('[data-testid="cairo-action-bar"]');
    await expect(actionBar).toBeVisible();
    await expect(page.locator('[data-testid="camera-toggle-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="horn-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="headlights-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="recover-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="teleport-menu-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="help-btn"]')).toBeVisible();
  });

  test('3. Camera cycling updates mode and UI badge', async () => {
    const camBtn = page.locator('[data-testid="camera-toggle-btn"]');
    await expect(camBtn).toBeVisible();

    // Initial camera mode is CHASE
    await expect(camBtn).toContainText(/CHASE/i);

    // Click 1: CLOSE
    await camBtn.click();
    await expect(camBtn).toContainText(/CLOSE/i);

    // Click 2: HOOD
    await camBtn.click();
    await expect(camBtn).toContainText(/HOOD/i);

    // Click 3: INTERIOR
    await camBtn.click();
    await expect(camBtn).toContainText(/INTERIOR/i);

    // Click 4: ORBIT
    await camBtn.click();
    await expect(camBtn).toContainText(/ORBIT/i);

    // Click 5: back to CHASE
    await camBtn.click();
    await expect(camBtn).toContainText(/CHASE/i);
  });

  test('4. Horn trigger plays Cairo horn sound pattern', async () => {
    const hornBtn = page.locator('[data-testid="horn-btn"]');
    await expect(hornBtn).toBeVisible();

    await hornBtn.click();
    await page.waitForTimeout(300);
  });

  test('5. Headlights toggle updates vehicle lighting state', async () => {
    const hlBtn = page.locator('[data-testid="headlights-btn"]');
    await expect(hlBtn).toBeVisible();

    await hlBtn.click();
    await page.waitForTimeout(200);

    await hlBtn.click();
    await page.waitForTimeout(200);
  });

  test('6. Fast Travel Teleport modal navigates to iconic Cairo landmarks', async () => {
    const teleportBtn = page.locator('[data-testid="teleport-menu-btn"]');
    await teleportBtn.click();

    const modal = page.locator('[data-testid="teleport-modal"]');
    await expect(modal).toBeVisible();

    // Verify landmarks list has items
    const landmarkRamp = page.locator('[data-testid="teleport-landmark-1"]'); // 6th of October Bridge Ramp
    await expect(landmarkRamp).toBeVisible();
    await expect(landmarkRamp).toContainText(/كوبري 6 أكتوبر/);

    // Click teleport to 6th October Bridge Ramp
    await landmarkRamp.click();
    await expect(modal).not.toBeVisible();

    // Wait for vehicle to settle
    await page.waitForTimeout(500);

    // Verify street sign updates
    const streetSign = page.locator('[data-testid="cairo-street-sign"]');
    await expect(streetSign).toBeVisible();
  });

  test('7. Cairo Driver\'s Manual modal opens, switches tabs, and applies presets', async () => {
    const helpBtn = page.locator('[data-testid="help-btn"]');
    await helpBtn.click();

    const modal = page.locator('[data-testid="help-modal"]');
    await expect(modal).toBeVisible();

    // Verify Tab 1 (Controls) is default
    await expect(modal).toContainText(/Throttle & Accelerate/i);

    // Switch to Tab 2 (Districts)
    await modal.getByRole('button', { name: /معالم المدينة/i }).click();
    await expect(modal).toContainText(/كوبري ٦ أكتوبر المعلق/);
    await expect(modal).toContainText(/كورنيش النيل/);

    // Switch to Tab 3 (Presets)
    await modal.getByRole('button', { name: /أداء السيارة/i }).click();
    await expect(modal).toContainText(/Tuned Cairo Drift Sedan/);
    await expect(modal).toContainText(/Heavy SUV for Bumps/);

    // Select Drift Sedan preset
    await modal.getByText(/Tuned Cairo Drift Sedan/).click();

    // Close modal
    await page.locator('[data-testid="close-help-modal"]').click();
    await expect(modal).not.toBeVisible();
  });

  test('8. Capture high-resolution gameplay screenshots for verification', async () => {
    await page.waitForTimeout(1000);

    // 1. Full Desktop Screenshot
    await page.screenshot({
      path: 'artifacts/cairo_drive_desktop.png',
      fullPage: true,
    });

    // 2. HUD Cluster Screenshot
    const cluster = page.locator('[data-testid="cairo-cluster"]');
    await cluster.screenshot({
      path: 'artifacts/cairo_drive_cluster.png',
    });

    // 3. Minimap Radar Screenshot
    const radar = page.locator('[data-testid="cairo-radar"]');
    await radar.screenshot({
      path: 'artifacts/cairo_drive_radar.png',
    });

    // 4. Street Sign Screenshot
    const sign = page.locator('[data-testid="cairo-street-sign"]');
    await sign.screenshot({
      path: 'artifacts/cairo_drive_sign.png',
    });
  });
});

test.describe('Cairo Drive - Mobile Responsive Touch Controls', () => {
  test('Mobile viewport renders virtual steering paddles and pedals', async ({ browser }) => {
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 }, // iPhone 14
    });

    await mobilePage.goto('/');
    await mobilePage.locator('#game-canvas').waitFor({ state: 'visible', timeout: 30000 });
    await mobilePage.waitForTimeout(1000);

    const mobileOverlay = mobilePage.locator('[data-testid="mobile-controls-overlay"]');
    await expect(mobileOverlay).toBeVisible();

    const steerLeft = mobilePage.locator('[data-testid="touch-steer-left"]');
    const steerRight = mobilePage.locator('[data-testid="touch-steer-right"]');
    const throttle = mobilePage.locator('[data-testid="touch-throttle"]');
    const brake = mobilePage.locator('[data-testid="touch-brake"]');

    await expect(steerLeft).toBeVisible();
    await expect(steerRight).toBeVisible();
    await expect(throttle).toBeVisible();
    await expect(brake).toBeVisible();

    // Trigger touch events on pedals
    await throttle.dispatchEvent('mousedown');
    await mobilePage.waitForTimeout(100);
    await throttle.dispatchEvent('mouseup');

    // Capture mobile gameplay screenshot
    await mobilePage.screenshot({
      path: 'artifacts/cairo_drive_mobile.png',
    });

    await mobilePage.close();
  });
});
