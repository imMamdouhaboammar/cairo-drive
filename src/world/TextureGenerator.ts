import * as THREE from 'three';

export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  private static isHeadless(): boolean {
    return typeof document === 'undefined' || !document.createElement;
  }

  private static getFallbackTexture(): THREE.CanvasTexture {
    const canvas = {
      width: 16,
      height: 16,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLCanvasElement;
    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates a realistic asphalt texture with asphalt grain, oil spots, and road striping
   */
  public static createAsphaltTexture(): THREE.CanvasTexture {
    const key = 'asphalt';
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.isHeadless()) return this.getFallbackTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base dark asphalt color
    ctx.fillStyle = '#1c1e22';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine asphalt grain noise
    const imgData = ctx.getImageData(0, 0, 1024, 1024);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 35;
      data[i] = Math.min(255, Math.max(0, data[i]! + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1]! + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2]! + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Weathering, tar cracks and subtle oil stains
    ctx.fillStyle = 'rgba(10, 10, 12, 0.4)';
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      const radius = 15 + Math.random() * 45;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Road side lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, 1024);
    ctx.moveTo(1024 - 30, 0);
    ctx.lineTo(1024 - 30, 1024);
    ctx.stroke();

    // Center dashed line (warm highway yellow)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 16;
    ctx.setLineDash([80, 60]);
    ctx.beginPath();
    ctx.moveTo(512, 0);
    ctx.lineTo(512, 1024);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Classic Cairo black-and-white curbstone texture (بلدورات أبيض في أسود)
   */
  public static createCurbTexture(): THREE.CanvasTexture {
    const key = 'curb';
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.isHeadless()) return this.getFallbackTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Alternating black and white blocks
    const blockWidth = 64;
    for (let x = 0; x < 512; x += blockWidth) {
      const isBlack = (x / blockWidth) % 2 === 0;
      ctx.fillStyle = isBlack ? '#1e2024' : '#f1f5f9';
      ctx.fillRect(x, 0, blockWidth, 128);

      // Add chipped concrete edges and dust grime
      ctx.fillStyle = 'rgba(120, 105, 85, 0.35)';
      ctx.fillRect(x, 100, blockWidth, 28);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Egyptian red clay brick texture (طوب أحمر) for alley buildings and unfinished floors
   */
  public static createRedBrickTexture(): THREE.CanvasTexture {
    const key = 'red_brick';
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.isHeadless()) return this.getFallbackTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Mortar background
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 512, 512);

    const brickW = 60;
    const brickH = 26;
    const mortar = 4;

    for (let y = 0; y < 512; y += brickH + mortar) {
      const row = Math.floor(y / (brickH + mortar));
      const offsetX = (row % 2) * (brickW / 2);

      for (let x = -brickW; x < 512 + brickW; x += brickW + mortar) {
        // Egyptian red/terracotta brick tones with natural variation
        const hue = 12 + Math.random() * 8;
        const sat = 55 + Math.random() * 20;
        const light = 35 + Math.random() * 15;
        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.fillRect(x + offsetX, y, brickW, brickH);

        // Brick porous texture
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let d = 0; d < 4; d++) {
          ctx.fillRect(
            x + offsetX + Math.random() * (brickW - 4),
            y + Math.random() * (brickH - 4),
            3,
            3
          );
        }
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Egyptian stucco and weathered desert limestone plaster
   */
  public static createPlasterTexture(baseHue: number = 38): THREE.CanvasTexture {
    const key = `plaster_${baseHue}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.isHeadless()) return this.getFallbackTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = `hsl(${baseHue}, 35%, 68%)`;
    ctx.fillRect(0, 0, 512, 512);

    // Weathering, sun fading, and dust streaks
    for (let i = 0; i < 200; i++) {
      const alpha = 0.05 + Math.random() * 0.1;
      ctx.fillStyle = `rgba(180, 150, 110, ${alpha})`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 80, 15);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }

  /**
   * Authentic Cairo Shopfront signs in Arabic & English
   */
  public static createShopSignTexture(index: number = 0): THREE.CanvasTexture {
    if (this.isHeadless()) return this.getFallbackTexture();
    const signs = [
      { ar: 'كشري الزعيم', en: 'EL-ZAEEM KOSHARY', bg: '#dc2626', border: '#fef08a' },
      { ar: 'قهوة الفيشاوي', en: 'EL-FISHAWY CAFE', bg: '#065f46', border: '#fde047' },
      { ar: 'صيدلية النيل', en: 'NILE PHARMACY', bg: '#1e40af', border: '#60a5fa' },
      { ar: 'سوبرماركت السلام', en: 'EL-SALAM MARKET', bg: '#b45309', border: '#fef3c7' },
      { ar: 'مشويات الحاتي', en: 'EL-HATY GRILL', bg: '#991b1b', border: '#fbbf24' },
    ];

    const sign = signs[index % signs.length]!;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Sign background
    ctx.fillStyle = sign.bg;
    ctx.fillRect(0, 0, 512, 128);

    // Ornate border
    ctx.strokeStyle = sign.border;
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    // Arabic primary text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px "Cairo", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sign.ar, 256, 50);

    // English subtext
    ctx.font = 'bold 20px "Chakra Petch", sans-serif';
    ctx.fillStyle = sign.border;
    ctx.fillText(sign.en, 256, 95);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Authentic Egyptian Vehicle License Plate
   */
  public static createLicensePlateTexture(letters: string = 'ق هـ ر', numbers: string = '٧ ٤ ١'): THREE.CanvasTexture {
    if (this.isHeadless()) return this.getFallbackTexture();
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Plate background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 128);

    // Top official blue strip
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, 256, 42);

    // Top text: مصر / EGYPT
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px "Cairo", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('مـصـر', 242, 28);
    ctx.textAlign = 'left';
    ctx.font = 'bold 16px "Chakra Petch", sans-serif';
    ctx.fillText('EGYPT', 14, 28);

    // Bottom plate characters
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Cairo", sans-serif';
    ctx.fillText(`${letters}  ${numbers}`, 128, 92);

    // Outer border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 252, 124);

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Islamic geometric Mashrabiya wooden lattice texture
   */
  public static createMashrabiyaTexture(): THREE.CanvasTexture {
    const key = 'mashrabiya';
    if (this.cache.has(key)) return this.cache.get(key)!;
    if (this.isHeadless()) return this.getFallbackTexture();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Dark wood background
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, 256, 256);

    // Carved latticework openings
    ctx.fillStyle = '#1a100b';
    const step = 32;
    for (let y = 0; y < 256; y += step) {
      for (let x = 0; x < 256; x += step) {
        ctx.beginPath();
        ctx.arc(x + step / 2, y + step / 2, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, step - 4, step - 4);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.cache.set(key, texture);
    return texture;
  }
}
