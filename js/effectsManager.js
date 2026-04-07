/**
 * 通天箓 - 特效管理器（性能优化版）
 * 使用 CSS动画 + SVG贴图 + 精简粒子
 * 实现动画电影级别的视觉效果
 */

class EffectsManager {
    constructor(particleEngine) {
        this.particleEngine = particleEngine;
        this.effectContainer = document.getElementById('fullscreenEffect');
        this.effectTimeout = null;
        this.currentEffect = null;
        
        // 预定义SVG素材
        this.svgAssets = {
            vine: this.createVineSVG(),
            flower: this.createFlowerSVG(),
            lightning: this.createLightningSVG(),
            blade: this.createBladeSVG(),
            crack: this.createCrackSVG(),
            icicle: this.createIcicleSVG(),
            petal: this.createPetalSVG(),
            ripple: this.createRippleSVG()
        };
    }

    // ==================== SVG 素材生成 ====================
    
    createVineSVG() {
        return `<svg viewBox="0 0 200 400" class="vine-svg">
            <defs>
                <linearGradient id="vineGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" style="stop-color:#1a4d1a"/>
                    <stop offset="50%" style="stop-color:#228B22"/>
                    <stop offset="100%" style="stop-color:#32CD32"/>
                </linearGradient>
                <filter id="vineGlow">
                    <feGaussianBlur stdDeviation="2" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <!-- 主藤蔓 -->
            <path d="M100,400 C70,350 130,300 80,250 C40,200 140,150 100,100 C70,60 120,30 100,0" 
                  fill="none" stroke="url(#vineGrad)" stroke-width="12" stroke-linecap="round" filter="url(#vineGlow)"/>
            <!-- 小藤蔓分支 -->
            <path d="M80,320 C50,300 30,280 20,250" fill="none" stroke="#228B22" stroke-width="5" stroke-linecap="round"/>
            <path d="M100,240 C140,220 160,190 180,170" fill="none" stroke="#32CD32" stroke-width="4" stroke-linecap="round"/>
            <path d="M90,160 C50,140 30,110 10,90" fill="none" stroke="#228B22" stroke-width="4" stroke-linecap="round"/>
            <!-- 叶子 -->
            <g class="vine-leaves">
                <path d="M20,250 Q0,230 20,210 Q40,230 20,250" fill="#32CD32"/>
                <path d="M180,170 Q200,150 180,130 Q160,150 180,170" fill="#228B22"/>
                <path d="M10,90 Q-10,70 10,50 Q30,70 10,90" fill="#90EE90"/>
                <path d="M130,300 Q150,280 130,260 Q110,280 130,300" fill="#32CD32"/>
            </g>
            <!-- 小花苞 -->
            <circle cx="25" cy="245" r="6" fill="#FF69B4"/>
            <circle cx="175" cy="165" r="5" fill="#FFB6C1"/>
            <circle cx="15" cy="85" r="4" fill="#FF69B4"/>
        </svg>`;
    }

    createFlowerSVG() {
        return `<svg viewBox="0 0 80 80" class="flower-svg">
            <defs>
                <radialGradient id="flowerCenter">
                    <stop offset="0%" style="stop-color:#FFD700"/>
                    <stop offset="100%" style="stop-color:#FFA500"/>
                </radialGradient>
                <filter id="flowerGlow">
                    <feGaussianBlur stdDeviation="1.5" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <g transform="translate(40,40)" filter="url(#flowerGlow)">
                <!-- 花瓣层1 -->
                <g class="petals-outer">
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF1493"/>
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF69B4" transform="rotate(60)"/>
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF1493" transform="rotate(120)"/>
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF69B4" transform="rotate(180)"/>
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF1493" transform="rotate(240)"/>
                    <ellipse cx="0" cy="-22" rx="10" ry="20" fill="#FF69B4" transform="rotate(300)"/>
                </g>
                <!-- 花瓣层2 -->
                <g class="petals-inner" transform="rotate(30)">
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFB6C1"/>
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFC0CB" transform="rotate(60)"/>
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFB6C1" transform="rotate(120)"/>
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFC0CB" transform="rotate(180)"/>
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFB6C1" transform="rotate(240)"/>
                    <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#FFC0CB" transform="rotate(300)"/>
                </g>
                <!-- 花蕊 -->
                <circle cx="0" cy="0" r="10" fill="url(#flowerCenter)"/>
                <circle cx="-3" cy="-3" r="2" fill="#FFE4B5"/>
                <circle cx="3" cy="-2" r="1.5" fill="#FFE4B5"/>
                <circle cx="0" cy="3" r="2" fill="#FFE4B5"/>
            </g>
        </svg>`;
    }

    createLightningSVG() {
        return `<svg viewBox="0 0 120 350" class="lightning-svg">
            <defs>
                <linearGradient id="boltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF"/>
                    <stop offset="30%" style="stop-color:#E6E6FA"/>
                    <stop offset="60%" style="stop-color:#9400D3"/>
                    <stop offset="100%" style="stop-color:#4B0082"/>
                </linearGradient>
                <filter id="lightningGlow">
                    <feGaussianBlur stdDeviation="6" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <!-- 主闪电 -->
            <path d="M60,0 L55,60 L80,65 L40,140 L70,145 L25,230 L60,235 L15,320 L50,240 L20,235 L55,155 L30,150 L65,75 L45,70 L60,0" 
                  fill="url(#boltGrad)" filter="url(#lightningGlow)"/>
            <!-- 分支1 -->
            <path d="M55,60 L25,100 L40,105 L10,150" 
                  fill="none" stroke="#9400D3" stroke-width="6" stroke-linecap="round" filter="url(#lightningGlow)"/>
            <!-- 分支2 -->
            <path d="M70,145 L100,180 L85,185 L110,220" 
                  fill="none" stroke="#DA70D6" stroke-width="4" stroke-linecap="round" filter="url(#lightningGlow)"/>
            <!-- 内部高光 -->
            <path d="M58,10 L54,55 L70,58 L45,120 L62,123 L35,200 L52,203 L30,280" 
                  fill="none" stroke="rgba(255,255,255,0.8)" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    }

    createBladeSVG() {
        return `<svg viewBox="0 0 500 80" class="blade-svg">
            <defs>
                <linearGradient id="bladeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color:transparent"/>
                    <stop offset="10%" style="stop-color:rgba(255,215,0,0.3)"/>
                    <stop offset="30%" style="stop-color:#FFD700"/>
                    <stop offset="50%" style="stop-color:#FFFFFF"/>
                    <stop offset="70%" style="stop-color:#FFD700"/>
                    <stop offset="90%" style="stop-color:rgba(255,215,0,0.3)"/>
                    <stop offset="100%" style="stop-color:transparent"/>
                </linearGradient>
                <filter id="bladeGlow">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <!-- 刀光主体 -->
            <path d="M0,40 Q125,20 250,40 Q375,60 500,40" fill="none" 
                  stroke="url(#bladeGrad)" stroke-width="8" stroke-linecap="round" filter="url(#bladeGlow)"/>
            <!-- 刀光内芯 -->
            <path d="M20,40 Q125,28 250,40 Q375,52 480,40" fill="none" 
                  stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
            <!-- 刀尖光点 -->
            <circle cx="480" cy="40" r="8" fill="#FFFFFF" filter="url(#bladeGlow)"/>
            <circle cx="20" cy="40" r="6" fill="#FFD700" filter="url(#bladeGlow)"/>
        </svg>`;
    }

    createCrackSVG() {
        return `<svg viewBox="0 0 200 200" class="crack-svg">
            <defs>
                <filter id="crackShadow">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.5)"/>
                </filter>
                <linearGradient id="crackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#2F1810"/>
                    <stop offset="100%" style="stop-color:#8B4513"/>
                </linearGradient>
            </defs>
            <!-- 主裂缝 -->
            <path d="M100,100 L95,80 L100,60 L90,40 L95,20 L85,0" fill="none" stroke="url(#crackGrad)" stroke-width="8" stroke-linecap="round" filter="url(#crackShadow)"/>
            <path d="M100,100 L110,75 L125,50 L135,25 L145,0" fill="none" stroke="#5D3A1A" stroke-width="6" stroke-linecap="round"/>
            <!-- 分支裂缝 -->
            <path d="M100,100 L75,90 L50,85 L25,75 L0,70" fill="none" stroke="#8B4513" stroke-width="5" stroke-linecap="round"/>
            <path d="M100,100 L130,95 L160,90 L185,82 L200,75" fill="none" stroke="#5D3A1A" stroke-width="4" stroke-linecap="round"/>
            <path d="M100,100 L95,130 L90,160 L82,185 L75,200" fill="none" stroke="url(#crackGrad)" stroke-width="6" stroke-linecap="round"/>
            <!-- 小裂纹 -->
            <path d="M95,80 L70,70" fill="none" stroke="#8B4513" stroke-width="2"/>
            <path d="M110,75 L130,65" fill="none" stroke="#8B4513" stroke-width="2"/>
            <path d="M95,130 L75,140" fill="none" stroke="#5D3A1A" stroke-width="2"/>
        </svg>`;
    }

    createIcicleSVG() {
        return `<svg viewBox="0 0 60 140" class="icicle-svg">
            <defs>
                <linearGradient id="iceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#FFFFFF"/>
                    <stop offset="30%" style="stop-color:#E0FFFF"/>
                    <stop offset="70%" style="stop-color:#87CEEB"/>
                    <stop offset="100%" style="stop-color:#00CED1"/>
                </linearGradient>
                <filter id="iceGlow">
                    <feGaussianBlur stdDeviation="3" result="blur"/>
                    <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            <!-- 冰柱主体 -->
            <path d="M30,0 L48,20 L45,45 L42,75 L38,105 L30,140 L22,105 L18,75 L15,45 L12,20 Z" 
                  fill="url(#iceGrad)" filter="url(#iceGlow)" opacity="0.9"/>
            <!-- 内部高光 -->
            <path d="M30,5 L40,18 L38,40 L35,70 L32,95 L30,120" 
                  fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-linecap="round"/>
            <!-- 冰晶纹理 -->
            <path d="M25,30 L35,35" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
            <path d="M22,55 L38,60" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
            <path d="M24,85 L36,88" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        </svg>`;
    }

    createPetalSVG() {
        return `<svg viewBox="0 0 40 40" class="petal-svg">
            <defs>
                <radialGradient id="petalGrad" cx="30%" cy="30%">
                    <stop offset="0%" style="stop-color:#FFC0CB"/>
                    <stop offset="100%" style="stop-color:#FF69B4"/>
                </radialGradient>
                <filter id="petalShadow">
                    <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="rgba(0,0,0,0.2)"/>
                </filter>
            </defs>
            <path d="M20,5 Q35,15 30,30 Q20,38 10,30 Q5,15 20,5" 
                  fill="url(#petalGrad)" filter="url(#petalShadow)"/>
            <path d="M20,8 Q28,15 25,25" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        </svg>`;
    }

    createRippleSVG() {
        return `<svg viewBox="0 0 200 200" class="ripple-svg">
            <defs>
                <radialGradient id="rippleGrad">
                    <stop offset="0%" style="stop-color:rgba(0,191,255,0)"/>
                    <stop offset="50%" style="stop-color:rgba(0,191,255,0.6)"/>
                    <stop offset="100%" style="stop-color:rgba(0,191,255,0)"/>
                </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="40" fill="none" stroke="url(#rippleGrad)" stroke-width="4"/>
            <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(30,144,255,0.5)" stroke-width="3"/>
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(135,206,250,0.3)" stroke-width="2"/>
        </svg>`;
    }

    // ==================== 元素特效播放 ====================

    playElementEffect(element) {
        console.log(`[EffectsManager] 播放 ${element} 特效`);
        this.clearEffect();

        switch (element) {
            case 'fire': this.playFireEffect(); break;
            case 'ice': this.playIceEffect(); break;
            case 'water': this.playWaterEffect(); break;
            case 'thunder': this.playThunderEffect(); break;
            case 'wood': this.playWoodEffect(); break;
            case 'metal': this.playMetalEffect(); break;
            case 'earth': this.playEarthEffect(); break;
            case 'wind': this.playWindEffect(); break;
            default: this.playDefaultEffect(element);
        }
    }

    // ==================== 🔥 火符 - 烈焰焚天 ====================
    playFireEffect() {
        this.effectContainer.innerHTML = `
            <div class="effect-fire-scene">
                <div class="fire-ambient"></div>
                <div class="fire-flames">
                    <div class="flame flame-1"></div>
                    <div class="flame flame-2"></div>
                    <div class="flame flame-3"></div>
                    <div class="flame flame-4"></div>
                    <div class="flame flame-5"></div>
                </div>
                <div class="fire-sparks-layer"></div>
                <div class="fire-heat-overlay"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        // 少量精确火星粒子
        this.emitFireSparks();
        this.scheduleCleanup(4000);
    }

    emitFireSparks() {
        const count = 30; // 减少粒子数量
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -4 - Math.random() * 4,
                    color: Math.random() > 0.5 ? '#FFD700' : '#FF6347',
                    size: 2 + Math.random() * 3,
                    gravity: -0.02,
                    decay: 0.02,
                    type: 'circle'
                }));
                this.particleEngine.startAnimation();
            }, i * 80);
        }
    }

    // ==================== ❄️ 冰符 - 冰封万里 ====================
    playIceEffect() {
        const icicles = this.generateIcicles();
        
        this.effectContainer.innerHTML = `
            <div class="effect-ice-scene">
                <div class="ice-frost-overlay"></div>
                <div class="ice-border-frost"></div>
                <div class="ice-icicles-top">${icicles.top}</div>
                <div class="ice-icicles-left">${icicles.left}</div>
                <div class="ice-icicles-right">${icicles.right}</div>
                <div class="ice-breath"></div>
                <div class="ice-crystals-float"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.emitIceCrystals();
        this.scheduleCleanup(4500);
    }

    generateIcicles() {
        let top = '', left = '', right = '';
        
        for (let i = 0; i < 15; i++) {
            const size = 40 + Math.random() * 60;
            const delay = Math.random() * 0.5;
            top += `<div class="icicle" style="left:${i * 7}%;height:${size}px;animation-delay:${delay}s">${this.svgAssets.icicle}</div>`;
        }
        
        for (let i = 0; i < 8; i++) {
            const size = 30 + Math.random() * 40;
            const delay = Math.random() * 0.5;
            left += `<div class="icicle-side" style="top:${i * 12}%;width:${size}px;animation-delay:${delay}s">${this.svgAssets.icicle}</div>`;
            right += `<div class="icicle-side" style="top:${i * 12}%;width:${size}px;animation-delay:${delay}s">${this.svgAssets.icicle}</div>`;
        }
        
        return { top, left, right };
    }

    emitIceCrystals() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: -10,
                    vx: (Math.random() - 0.5) * 1,
                    vy: 1 + Math.random() * 2,
                    color: '#E0FFFF',
                    size: 4 + Math.random() * 4,
                    gravity: 0.01,
                    decay: 0.008,
                    type: 'snowflake',
                    rotationSpeed: (Math.random() - 0.5) * 0.1
                }));
                this.particleEngine.startAnimation();
            }, i * 100);
        }
    }

    // ==================== 💧 水符 - 沧海横流 ====================
    playWaterEffect() {
        this.effectContainer.innerHTML = `
            <div class="effect-water-scene">
                <div class="water-bg"></div>
                <div class="water-ripples">
                    ${this.svgAssets.ripple}
                    ${this.svgAssets.ripple}
                    ${this.svgAssets.ripple}
                </div>
                <div class="water-drops-layer"></div>
                <div class="water-surface-shine"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.emitWaterDrops();
        this.scheduleCleanup(4000);
    }

    emitWaterDrops() {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: -10,
                    vx: 0,
                    vy: 5 + Math.random() * 3,
                    color: '#00BFFF',
                    size: 4 + Math.random() * 4,
                    gravity: 0.2,
                    decay: 0.015,
                    type: 'circle'
                }));
                this.particleEngine.startAnimation();
            }, i * 120);
        }
    }

    // ==================== ⚡ 雷符 - 天雷滚滚 ====================
    playThunderEffect() {
        const lightnings = this.generateLightnings();
        
        this.effectContainer.innerHTML = `
            <div class="effect-thunder-scene">
                <div class="thunder-darkness"></div>
                <div class="thunder-flash-overlay"></div>
                <div class="thunder-bolts">${lightnings}</div>
                <div class="thunder-electric-field"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.triggerThunderFlashes();
        this.scheduleCleanup(3500);
    }

    generateLightnings() {
        let html = '';
        const positions = [15, 35, 55, 75, 90];
        
        positions.forEach((pos, i) => {
            const scale = 0.6 + Math.random() * 0.6;
            const delay = i * 0.15;
            html += `<div class="thunder-bolt" style="left:${pos}%;transform:scale(${scale});animation-delay:${delay}s">${this.svgAssets.lightning}</div>`;
        });
        
        return html;
    }

    triggerThunderFlashes() {
        const flashTimes = [0, 200, 500, 800, 1200, 1800, 2500];
        flashTimes.forEach(time => {
            setTimeout(() => {
                this.particleEngine.addFlash('#FFFFFF');
            }, time);
        });
    }

    // ==================== 🌿 木符 - 万物生长 ====================
    playWoodEffect() {
        const vines = this.generateVines();
        const flowers = this.generateFlowers();
        
        this.effectContainer.innerHTML = `
            <div class="effect-wood-scene">
                <div class="wood-ambient-glow"></div>
                <div class="wood-vines-container">
                    ${vines.corners}
                </div>
                <div class="wood-flowers-container">
                    ${flowers}
                </div>
                <div class="wood-leaves-falling"></div>
                <div class="wood-light-rays"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.emitLeaves();
        this.scheduleCleanup(4500);
    }

    generateVines() {
        const corners = `
            <div class="vine-corner vine-tl">${this.svgAssets.vine}</div>
            <div class="vine-corner vine-tr">${this.svgAssets.vine}</div>
            <div class="vine-corner vine-bl">${this.svgAssets.vine}</div>
            <div class="vine-corner vine-br">${this.svgAssets.vine}</div>
        `;
        return { corners };
    }

    generateFlowers() {
        let html = '';
        const positions = [
            { x: 8, y: 15 }, { x: 92, y: 12 }, { x: 5, y: 85 }, { x: 95, y: 88 },
            { x: 15, y: 25 }, { x: 85, y: 22 }, { x: 12, y: 75 }, { x: 88, y: 78 }
        ];
        
        positions.forEach((pos, i) => {
            const size = 30 + Math.random() * 20;
            const delay = 0.3 + i * 0.15;
            html += `<div class="wood-flower" style="left:${pos.x}%;top:${pos.y}%;width:${size}px;height:${size}px;animation-delay:${delay}s">${this.svgAssets.flower}</div>`;
        });
        
        return html;
    }

    emitLeaves() {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: -10,
                    vx: (Math.random() - 0.5) * 2,
                    vy: 1 + Math.random() * 1.5,
                    color: Math.random() > 0.5 ? '#32CD32' : '#90EE90',
                    size: 8 + Math.random() * 6,
                    gravity: 0.01,
                    decay: 0.006,
                    type: 'petal',
                    rotationSpeed: (Math.random() - 0.5) * 0.15
                }));
                this.particleEngine.startAnimation();
            }, i * 150);
        }
    }

    // ==================== ⚔️ 金符 - 刀光剑影 ====================
    playMetalEffect() {
        const blades = this.generateBlades();
        
        this.effectContainer.innerHTML = `
            <div class="effect-metal-scene">
                <div class="metal-golden-flash"></div>
                <div class="metal-blades-container">${blades}</div>
                <div class="metal-sparks-layer"></div>
                <div class="metal-aura"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.emitMetalSparks();
        this.triggerGoldenFlashes();
        this.scheduleCleanup(3500);
    }

    generateBlades() {
        let html = '';
        const slashes = [
            { angle: -30, delay: 0, y: 30 },
            { angle: 30, delay: 0.2, y: 50 },
            { angle: -15, delay: 0.4, y: 40 },
            { angle: 45, delay: 0.6, y: 60 },
            { angle: -45, delay: 0.8, y: 35 },
            { angle: 0, delay: 1.0, y: 55 }
        ];
        
        slashes.forEach(s => {
            html += `<div class="blade-slash" style="top:${s.y}%;transform:rotate(${s.angle}deg);animation-delay:${s.delay}s">${this.svgAssets.blade}</div>`;
        });
        
        return html;
    }

    emitMetalSparks() {
        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const centerX = window.innerWidth / 2;
                const centerY = window.innerHeight / 2;
                const angle = Math.random() * Math.PI * 2;
                
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: centerX + (Math.random() - 0.5) * 200,
                    y: centerY + (Math.random() - 0.5) * 200,
                    vx: Math.cos(angle) * (3 + Math.random() * 4),
                    vy: Math.sin(angle) * (3 + Math.random() * 4),
                    color: Math.random() > 0.3 ? '#FFD700' : '#FFFFFF',
                    size: 2 + Math.random() * 3,
                    gravity: 0,
                    decay: 0.03,
                    type: 'star'
                }));
                this.particleEngine.startAnimation();
            }, i * 60);
        }
    }

    triggerGoldenFlashes() {
        [0, 200, 400, 600, 800, 1000].forEach(time => {
            setTimeout(() => this.particleEngine.addFlash('#FFD700'), time);
        });
    }

    // ==================== 🌍 土符 - 地动山摇 ====================
    playEarthEffect() {
        const cracks = this.generateCracks();
        
        this.effectContainer.innerHTML = `
            <div class="effect-earth-scene">
                <div class="earth-dust-layer"></div>
                <div class="earth-cracks-container">${cracks}</div>
                <div class="earth-debris-layer"></div>
                <div class="earth-rumble-overlay"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.shakeScreen();
        this.emitDebris();
        this.scheduleCleanup(3500);
    }

    generateCracks() {
        let html = '';
        const positions = [
            { x: 30, y: 70 }, { x: 50, y: 80 }, { x: 70, y: 75 },
            { x: 20, y: 85 }, { x: 80, y: 82 }
        ];
        
        positions.forEach((pos, i) => {
            const rotation = -30 + Math.random() * 60;
            const scale = 0.8 + Math.random() * 0.4;
            html += `<div class="earth-crack" style="left:${pos.x}%;top:${pos.y}%;transform:rotate(${rotation}deg) scale(${scale});animation-delay:${i * 0.1}s">${this.svgAssets.crack}</div>`;
        });
        
        return html;
    }

    shakeScreen() {
        const app = document.getElementById('app');
        if (!app) return;
        
        let count = 0;
        const shake = setInterval(() => {
            const x = (Math.random() - 0.5) * 8;
            const y = (Math.random() - 0.5) * 8;
            app.style.transform = `translate(${x}px, ${y}px)`;
            
            if (++count > 30) {
                clearInterval(shake);
                app.style.transform = '';
            }
        }, 50);
    }

    emitDebris() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: Math.random() * window.innerWidth,
                    y: window.innerHeight,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -6 - Math.random() * 6,
                    color: Math.random() > 0.5 ? '#8B4513' : '#CD853F',
                    size: 6 + Math.random() * 8,
                    gravity: 0.3,
                    decay: 0.012,
                    type: 'circle'
                }));
                this.particleEngine.startAnimation();
            }, i * 60);
        }
    }

    // ==================== 🌸 风符 - 落英缤纷 ====================
    playWindEffect() {
        this.effectContainer.innerHTML = `
            <div class="effect-wind-scene">
                <div class="wind-bg-flow"></div>
                <div class="wind-swirl-center"></div>
                <div class="wind-petals-container"></div>
                <div class="wind-streaks"></div>
            </div>
        `;
        this.effectContainer.className = 'fullscreen-effect active';

        this.generatePetals();
        this.emitPetals();
        this.scheduleCleanup(4000);
    }

    generatePetals() {
        const container = this.effectContainer.querySelector('.wind-petals-container');
        if (!container) return;
        
        for (let i = 0; i < 25; i++) {
            const petal = document.createElement('div');
            petal.className = 'wind-petal';
            petal.innerHTML = this.svgAssets.petal;
            petal.style.cssText = `
                left: ${-10 + Math.random() * 20}%;
                top: ${Math.random() * 100}%;
                animation-delay: ${Math.random() * 2}s;
                animation-duration: ${2 + Math.random() * 2}s;
            `;
            container.appendChild(petal);
        }
    }

    emitPetals() {
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.particleEngine.addParticle(this.particleEngine.createParticle({
                    x: -20,
                    y: Math.random() * window.innerHeight,
                    vx: 6 + Math.random() * 4,
                    vy: (Math.random() - 0.5) * 2,
                    color: Math.random() > 0.5 ? '#FFB6C1' : '#FF69B4',
                    size: 8 + Math.random() * 6,
                    gravity: 0.01,
                    decay: 0.005,
                    type: 'petal',
                    rotationSpeed: (Math.random() - 0.5) * 0.3
                }));
                this.particleEngine.startAnimation();
            }, i * 100);
        }
    }

    // ==================== 默认特效 ====================
    playDefaultEffect(element) {
        this.effectContainer.className = 'fullscreen-effect active';
        this.particleEngine.emitBurst(element);
        this.scheduleCleanup(3000);
    }

    // ==================== 工具方法 ====================
    
    scheduleCleanup(delay) {
        this.effectTimeout = setTimeout(() => this.clearEffect(), delay);
    }

    clearEffect() {
        if (this.effectTimeout) {
            clearTimeout(this.effectTimeout);
            this.effectTimeout = null;
        }
        
        this.effectContainer.classList.add('fade-out');
        
        setTimeout(() => {
            this.effectContainer.className = 'fullscreen-effect hidden';
            this.effectContainer.innerHTML = '';
            
            const app = document.getElementById('app');
            if (app) app.style.transform = '';
        }, 500);
        
        this.currentEffect = null;
    }

    playDrawSuccess(x, y, element = 'gold') {
        this.particleEngine.emitRising(x, y, element);
        this.showSuccessToast(element);
    }

    showSuccessToast(element) {
        const names = {
            fire: '🔥 火符', water: '💧 水符', wood: '🌿 木符',
            metal: '⚡ 金符', earth: '🌍 土符', ice: '❄️ 冰符',
            thunder: '💜 雷符', wind: '🌸 风符', gold: '✨ 符箓'
        };

        const toast = document.createElement('div');
        toast.className = 'pattern-success';
        toast.textContent = names[element] || '符箓成功';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 1000);
    }

    playActivation(talisman) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // 精简的爆发粒子
        this.particleEngine.emit({
            x: centerX, y: centerY,
            count: 40,
            element: talisman.element,
            spread: Math.PI * 2,
            speed: 4,
            gravity: -0.03,
            decay: 0.015
        });
        
        setTimeout(() => this.playElementEffect(talisman.element), 300);
    }

    playHoverProgress(progress, x, y) {
        if (progress > 0 && progress < 1 && Math.random() < 0.2) {
            this.particleEngine.addParticle(this.particleEngine.createParticle({
                x: x + (Math.random() - 0.5) * 40,
                y: y + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 2,
                color: '#FFD700',
                size: 3,
                decay: 0.04
            }));
            this.particleEngine.startAnimation();
        }
    }

    playCancelEffect() {
        this.particleEngine.emit({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
            count: 20,
            element: 'cyan',
            spread: Math.PI,
            angle: Math.PI / 2,
            speed: 2,
            gravity: 0.08,
            decay: 0.025
        });
    }
}

window.EffectsManager = EffectsManager;
