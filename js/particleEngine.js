/**
 * 通天箓 - 粒子引擎模块
 * 负责所有粒子特效的管理和渲染
 */

class ParticleEngine {
    constructor() {
        this.canvas = document.getElementById('effectsCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 粒子池（精简数量优化性能）
        this.particles = [];
        this.maxParticles = 300;
        
        // 元素颜色配置
        this.elementColors = {
            fire: { primary: '#FF4500', secondary: '#FF8C00', glow: '#FFD700' },
            water: { primary: '#00BFFF', secondary: '#1E90FF', glow: '#87CEEB' },
            wood: { primary: '#32CD32', secondary: '#228B22', glow: '#90EE90' },
            metal: { primary: '#FFD700', secondary: '#FFA500', glow: '#FFFACD' },
            earth: { primary: '#CD853F', secondary: '#8B4513', glow: '#DEB887' },
            ice: { primary: '#E0FFFF', secondary: '#00CED1', glow: '#F0FFFF' },
            thunder: { primary: '#9400D3', secondary: '#8A2BE2', glow: '#DA70D6' },
            wind: { primary: '#FFB6C1', secondary: '#FF69B4', glow: '#FFF0F5' },
            gold: { primary: '#FFD700', secondary: '#FFA500', glow: '#FFFACD' },
            cyan: { primary: '#00D4FF', secondary: '#0099CC', glow: '#87CEEB' }
        };

        // 动画状态
        this.isAnimating = false;
        this.animationId = null;

        // 初始化尺寸
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 调整画布尺寸
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * 创建粒子
     * @param {Object} options 粒子配置
     * @returns {Object} 粒子对象
     */
    createParticle(options = {}) {
        return {
            x: options.x || this.width / 2,
            y: options.y || this.height / 2,
            vx: options.vx || (Math.random() - 0.5) * 4,
            vy: options.vy || -Math.random() * 5 - 2,
            size: options.size || 3 + Math.random() * 4,
            color: options.color || '#FFD700',
            alpha: options.alpha || 1,
            decay: options.decay || 0.02,
            gravity: options.gravity || 0.05,
            friction: options.friction || 0.99,
            type: options.type || 'circle', // circle, star, snowflake, petal
            rotation: options.rotation || 0,
            rotationSpeed: options.rotationSpeed || 0,
            life: options.life || 1,
            maxLife: options.maxLife || 1
        };
    }

    /**
     * 添加粒子
     * @param {Object} particle 
     */
    addParticle(particle) {
        if (this.particles.length < this.maxParticles) {
            this.particles.push(particle);
        }
    }

    /**
     * 发射粒子组
     * @param {Object} options 发射配置
     */
    emit(options = {}) {
        const {
            x = this.width / 2,
            y = this.height / 2,
            count = 50,
            element = 'gold',
            spread = Math.PI * 2,
            angle = -Math.PI / 2,
            speed = 5,
            speedVariance = 2,
            sizeMin = 2,
            sizeMax = 6,
            gravity = 0.05,
            decay = 0.015,
            type = 'circle'
        } = options;

        const colors = this.elementColors[element] || this.elementColors.gold;

        for (let i = 0; i < count; i++) {
            const particleAngle = angle + (Math.random() - 0.5) * spread;
            const particleSpeed = speed + (Math.random() - 0.5) * speedVariance * 2;
            const colorChoice = Math.random();
            let color;
            
            if (colorChoice < 0.5) {
                color = colors.primary;
            } else if (colorChoice < 0.8) {
                color = colors.secondary;
            } else {
                color = colors.glow;
            }

            this.addParticle(this.createParticle({
                x: x + (Math.random() - 0.5) * 20,
                y: y + (Math.random() - 0.5) * 20,
                vx: Math.cos(particleAngle) * particleSpeed,
                vy: Math.sin(particleAngle) * particleSpeed,
                size: sizeMin + Math.random() * (sizeMax - sizeMin),
                color: color,
                gravity: gravity,
                decay: decay,
                type: type,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.2
            }));
        }

        this.startAnimation();
    }

    /**
     * 发射上升粒子（符箓生效）
     * @param {number} x 
     * @param {number} y 
     * @param {string} element 
     */
    emitRising(x, y, element = 'gold') {
        this.emit({
            x, y,
            count: 80,
            element: element,
            spread: Math.PI / 3,
            angle: -Math.PI / 2,
            speed: 4,
            speedVariance: 2,
            gravity: -0.02, // 负重力=上升
            decay: 0.01
        });
    }

    /**
     * 发射爆发粒子（全屏特效）
     * @param {string} element 
     */
    emitBurst(element = 'fire') {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        this.emit({
            x: centerX,
            y: centerY,
            count: 150,
            element: element,
            spread: Math.PI * 2,
            angle: 0,
            speed: 8,
            speedVariance: 4,
            sizeMin: 3,
            sizeMax: 8,
            gravity: 0.02,
            decay: 0.008
        });
    }

    /**
     * 发射元素特效
     * @param {string} element 元素类型
     */
    emitElementEffect(element) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;

        switch (element) {
            case 'fire':
                this.emitFire(centerX, centerY + 100);
                break;
            case 'water':
                this.emitWater(centerX, centerY);
                break;
            case 'wood':
                this.emitWood(centerX, centerY + 100);
                break;
            case 'metal':
                this.emitMetal(centerX, centerY);
                break;
            case 'earth':
                this.emitEarth(centerX, centerY);
                break;
            case 'ice':
                this.emitIce(centerX, centerY - 50);
                break;
            case 'thunder':
                this.emitThunder(centerX, centerY);
                break;
            case 'wind':
                this.emitWind(centerX, centerY);
                break;
            default:
                this.emitBurst('gold');
        }
    }

    /**
     * 火焰特效 - 精简版（主效果由CSS驱动）
     */
    emitFire(x, y) {
        // 少量火星点缀
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.addParticle(this.createParticle({
                    x: x + (Math.random() - 0.5) * 200,
                    y: y,
                    vx: (Math.random() - 0.5) * 2,
                    vy: -3 - Math.random() * 3,
                    color: Math.random() > 0.5 ? '#FFD700' : '#FF6347',
                    size: 2 + Math.random() * 2,
                    gravity: -0.02,
                    decay: 0.025,
                    type: 'circle'
                }));
            }, i * 50);
        }
        this.startAnimation();
    }

    /**
     * 水波特效
     */
    emitWater(x, y) {
        for (let wave = 0; wave < 5; wave++) {
            setTimeout(() => {
                this.emit({
                    x, y,
                    count: 60,
                    element: 'water',
                    spread: Math.PI * 2,
                    speed: 3 + wave * 2,
                    gravity: 0,
                    decay: 0.02
                });
            }, wave * 200);
        }
    }

    /**
     * 木系特效
     */
    emitWood(x, y) {
        for (let i = 0; i < 80; i++) {
            setTimeout(() => {
                const angle = (i / 80) * Math.PI * 4;
                const radius = i * 2;
                this.addParticle(this.createParticle({
                    x: x + Math.cos(angle) * radius * 0.3,
                    y: y,
                    vx: Math.cos(angle) * 0.5,
                    vy: -2 - Math.random() * 2,
                    color: Math.random() > 0.5 ? '#32CD32' : '#90EE90',
                    gravity: -0.03,
                    decay: 0.01,
                    size: 4 + Math.random() * 4
                }));
            }, i * 15);
        }
        this.startAnimation();
    }

    /**
     * 金系特效
     */
    emitMetal(x, y) {
        this.emit({
            x, y,
            count: 100,
            element: 'metal',
            spread: Math.PI * 2,
            speed: 6,
            type: 'star',
            decay: 0.01
        });

        // 闪光效果
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.addFlash();
            }, i * 100);
        }
    }

    /**
     * 土系特效
     */
    emitEarth(x, y) {
        const colors = this.elementColors.earth;
        
        for (let i = 0; i < 60; i++) {
            this.addParticle(this.createParticle({
                x: x + (Math.random() - 0.5) * 200,
                y: y - 50,
                vx: (Math.random() - 0.5) * 3,
                vy: Math.random() * 5 + 2,
                color: Math.random() > 0.5 ? colors.primary : colors.secondary,
                gravity: 0.3,
                decay: 0.008,
                size: 5 + Math.random() * 10,
                friction: 0.95
            }));
        }
        this.startAnimation();
    }

    /**
     * 冰系特效 - 精简版（主效果由CSS驱动）
     */
    emitIce(x, y) {
        // 少量雪花飘落
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.addParticle(this.createParticle({
                    x: Math.random() * this.width,
                    y: -20,
                    vx: (Math.random() - 0.5) * 1,
                    vy: 1 + Math.random() * 2,
                    color: Math.random() > 0.3 ? '#FFFFFF' : '#E0FFFF',
                    gravity: 0.01,
                    decay: 0.008,
                    size: 4 + Math.random() * 4,
                    type: 'snowflake',
                    rotationSpeed: (Math.random() - 0.5) * 0.1
                }));
            }, i * 100);
        }
        this.startAnimation();
    }

    /**
     * 雷电特效 - 精简版（主效果由CSS驱动）
     */
    emitThunder(x, y) {
        // 少量电弧粒子
        this.emit({
            x, y,
            count: 30,
            element: 'thunder',
            spread: Math.PI * 2,
            speed: 6,
            sizeMin: 3,
            sizeMax: 6,
            decay: 0.03
        });

        // 闪光效果
        this.addFlash('#FFFFFF');
        setTimeout(() => this.addFlash('#9400D3'), 100);
        setTimeout(() => this.addFlash('#FFFFFF'), 300);
    }

    /**
     * 风系特效 - 精简版（主效果由CSS驱动）
     */
    emitWind(x, y) {
        // 少量花瓣飘过
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                this.addParticle(this.createParticle({
                    x: -30,
                    y: Math.random() * this.height,
                    vx: 6 + Math.random() * 4,
                    vy: (Math.random() - 0.5) * 2,
                    color: Math.random() > 0.5 ? '#FFB6C1' : '#FF69B4',
                    gravity: 0.01,
                    decay: 0.006,
                    size: 8 + Math.random() * 6,
                    type: 'petal',
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.3
                }));
            }, i * 100);
        }
        this.startAnimation();
    }

    /**
     * 添加全屏闪光
     * @param {string} color 
     */
    addFlash(color = '#FFFFFF') {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        flash.style.background = color;
        document.body.appendChild(flash);
        
        setTimeout(() => flash.remove(), 300);
    }

    /**
     * 更新所有粒子
     */
    update() {
        this.particles = this.particles.filter(p => {
            // 更新位置
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.gravity;
            p.x += p.vx;
            p.y += p.vy;
            
            // 更新旋转
            p.rotation += p.rotationSpeed;
            
            // 更新生命
            p.alpha -= p.decay;
            p.life -= p.decay;
            
            // 检查是否存活
            return p.alpha > 0 && 
                   p.x > -50 && p.x < this.width + 50 &&
                   p.y > -50 && p.y < this.height + 50;
        });
    }

    /**
     * 渲染所有粒子
     */
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.alpha;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);

            switch (p.type) {
                case 'star':
                    this.drawStar(p);
                    break;
                case 'snowflake':
                    this.drawSnowflake(p);
                    break;
                case 'petal':
                    this.drawPetal(p);
                    break;
                default:
                    this.drawCircle(p);
            }

            this.ctx.restore();
        });
    }

    /**
     * 绘制圆形粒子
     * @param {Object} p 
     */
    drawCircle(p) {
        // 光晕
        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(0.5, this.hexToRgba(p.color, 0.5));
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
        this.ctx.fill();

        // 核心
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size * 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * 绘制星形粒子
     * @param {Object} p 
     */
    drawStar(p) {
        const spikes = 4;
        const outerRadius = p.size;
        const innerRadius = p.size * 0.4;

        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();

        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    /**
     * 绘制雪花粒子
     * @param {Object} p 
     */
    drawSnowflake(p) {
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 5;

        for (let i = 0; i < 6; i++) {
            this.ctx.rotate(Math.PI / 3);
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(0, -p.size);
            this.ctx.moveTo(0, -p.size * 0.6);
            this.ctx.lineTo(-p.size * 0.3, -p.size * 0.8);
            this.ctx.moveTo(0, -p.size * 0.6);
            this.ctx.lineTo(p.size * 0.3, -p.size * 0.8);
            this.ctx.stroke();
        }

        this.ctx.shadowBlur = 0;
    }

    /**
     * 绘制花瓣粒子
     * @param {Object} p 
     */
    drawPetal(p) {
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 5;
        
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.shadowBlur = 0;
    }

    /**
     * 十六进制转RGBA
     * @param {string} hex 
     * @param {number} alpha 
     * @returns {string}
     */
    hexToRgba(hex, alpha) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(255, 255, 255, ${alpha})`;
        
        return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
    }

    /**
     * 开始动画循环
     */
    startAnimation() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        const animate = () => {
            this.update();
            this.render();
            
            if (this.particles.length > 0) {
                this.animationId = requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };
        
        animate();
    }

    /**
     * 停止动画
     */
    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.isAnimating = false;
    }

    /**
     * 清除所有粒子
     */
    clear() {
        this.particles = [];
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}

// 导出
window.ParticleEngine = ParticleEngine;
